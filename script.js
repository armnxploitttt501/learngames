// ===== Data: [gambar, Inggris, Indonesia] =====
// Mau nambah hewan atau buah? Tambah baris baru di sini.
const mk = (a) => a.map(([e, en, id]) => ({ e, en, id }));
const DATA = {
  animals: mk([
    ["🐶", "dog", "anjing"], ["🐱", "cat", "kucing"], ["🐘", "elephant", "gajah"],
    ["🦁", "lion", "singa"], ["🐯", "tiger", "harimau"], ["🐒", "monkey", "monyet"],
    ["🐰", "rabbit", "kelinci"], ["🐮", "cow", "sapi"], ["🐔", "chicken", "ayam"],
    ["🦆", "duck", "bebek"], ["🐟", "fish", "ikan"], ["🐍", "snake", "ular"],
    ["🐢", "turtle", "kura-kura"], ["🦒", "giraffe", "jerapah"], ["🐻", "bear", "beruang"],
    ["🐴", "horse", "kuda"], ["🐑", "sheep", "domba"], ["🐸", "frog", "katak"],
    ["🦋", "butterfly", "kupu-kupu"], ["🐧", "penguin", "pinguin"],
    ["🐬", "dolphin", "lumba-lumba"], ["🐜", "ant", "semut"]
  ]),
  fruits: mk([
    ["🍎", "apple", "apel"], ["🍌", "banana", "pisang"], ["🍇", "grape", "anggur"],
    ["🍊", "orange", "jeruk"], ["🍓", "strawberry", "stroberi"], ["🍉", "watermelon", "semangka"],
    ["🍍", "pineapple", "nanas"], ["🥭", "mango", "mangga"], ["🍋", "lemon", "lemon"],
    ["🍒", "cherry", "ceri"], ["🍑", "peach", "persik"], ["🥥", "coconut", "kelapa"],
    ["🍐", "pear", "pir"], ["🥝", "kiwi", "kiwi"], ["🍈", "melon", "melon"],
    ["🍅", "tomato", "tomat"]
  ])
};

const TOTAL_ROUNDS = 10, MAX_LIVES = 3, PAIRS = 6;
const TIME = { quiz: 10, scramble: 30 };
const $ = (id) => document.getElementById(id);
const el = {
  screens: document.querySelectorAll(".screen"),
  score: $("score"), round: $("round"), lives: $("lives"),
  streakWrap: $("streak-wrap"), streak: $("streak"), bar: $("timer-bar"),
  picture: $("picture"), prompt: $("prompt"), word: $("word"), speak: $("speak"),
  area: $("answer-area"), feedback: $("feedback")
};

// ===== Penyimpanan kecil =====
const load = (k, d) => { try { return localStorage.getItem("kata-kilat-" + k) ?? d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem("kata-kilat-" + k, String(v)); } catch (e) {} };

let category = load("cat", "mixed");
let soundOn = load("sound", "on") === "on";
let state = null, timerId = null;
const pool = () => category === "mixed" ? [...DATA.animals, ...DATA.fruits] : DATA[category];

// ===== Maskot =====
const MASCOT_SVG = `
<svg class="mascot" viewBox="0 0 120 110" aria-hidden="true">
  <path d="M18 40 L24 6 L52 26 Z" fill="#ff8fc7" stroke="#3a4a86" stroke-width="4" stroke-linejoin="round"/>
  <path d="M102 40 L96 6 L68 26 Z" fill="#ff8fc7" stroke="#3a4a86" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="60" cy="64" rx="48" ry="40" fill="#ffffff" stroke="#3a4a86" stroke-width="4"/>
  <circle cx="42" cy="58" r="6" fill="#3a4a86"/><circle cx="78" cy="58" r="6" fill="#3a4a86"/>
  <circle cx="44" cy="56" r="2" fill="#fff"/><circle cx="80" cy="56" r="2" fill="#fff"/>
  <ellipse cx="30" cy="74" rx="8" ry="5" fill="#ff8fc7" opacity=".7"/>
  <ellipse cx="90" cy="74" rx="8" ry="5" fill="#ff8fc7" opacity=".7"/>
  <path class="m-happy" d="M50 74 Q60 86 70 74" fill="none" stroke="#3a4a86" stroke-width="4" stroke-linecap="round"/>
  <path class="m-sad" d="M50 82 Q60 72 70 82" fill="none" stroke="#3a4a86" stroke-width="4" stroke-linecap="round"/>
</svg>`;
document.querySelectorAll("[data-mascot]").forEach((s) => (s.innerHTML = MASCOT_SVG));
const setMascot = (mood) =>
  document.querySelectorAll(".mascot").forEach((m) => m.classList.toggle("sad", mood === "sad"));

// ===== Suara efek (dibuat langsung oleh browser, tanpa file) =====
let ac = null;
function beep(freq, dur, type = "triangle", when = 0, vol = 0.14) {
  if (!soundOn) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur);
  } catch (e) {}
}
const sfx = {
  ok() { beep(660, 0.12); beep(880, 0.2, "triangle", 0.1); },
  bad() { beep(200, 0.28, "sawtooth", 0, 0.07); },
  flip() { beep(520, 0.06, "sine"); },
  win() { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, "triangle", i * 0.12)); }
};

function speakWord(text) {
  if (!soundOn || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = 0.8;
  window.speechSynthesis.speak(u);
}

function confetti(n = 30) {
  const bits = ["⭐", "🎈", "🌸", "💙", "🍓", "✨"];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    const dur = 2 + Math.random() * 2;
    s.className = "confetti";
    s.textContent = bits[Math.floor(Math.random() * bits.length)];
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDuration = dur + "s";
    s.style.animationDelay = Math.random() * 0.6 + "s";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), (dur + 0.8) * 1000);
  }
}

// ===== Umum =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const showScreen = (id) => el.screens.forEach((s) => s.classList.toggle("active", s.id === id));
const getBest = (m) => Number(load("best-" + m, 0)) || 0;
function renderMenu() {
  ["quiz", "scramble", "match"].forEach((m) => ($("best-" + m).textContent = getBest(m)));
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.dataset.cat === category));
  $("sound").textContent = "Suara: " + (soundOn ? "nyala" : "mati");
  $("sound").setAttribute("aria-pressed", soundOn);
}

function renderLives() {
  el.lives.innerHTML = "";
  for (let i = 0; i < MAX_LIVES; i++) {
    const d = document.createElement("span");
    d.className = "life" + (i >= state.lives ? " lost" : "");
    d.textContent = i >= state.lives ? "\u2661" : "\u2665";
    el.lives.appendChild(d);
  }
}
function renderHud() {
  el.score.textContent = state.score;
  el.round.textContent = Math.min(state.index + 1, TOTAL_ROUNDS) + "/" + TOTAL_ROUNDS;
  el.streak.textContent = state.streak;
  el.streakWrap.hidden = state.streak < 2;
  renderLives();
}

function startMode(mode) {
  if (mode === "match") startMatch(); else startGame(mode);
}

// ===== Tebak Gambar dan Susun Huruf =====
function startGame(mode) {
  state = {
    mode, queue: shuffle(pool()).slice(0, TOTAL_ROUNDS), index: 0, score: 0,
    lives: MAX_LIVES, streak: 0, correct: 0, missed: [], locked: false, current: null
  };
  showScreen("game");
  nextQuestion();
}

function nextQuestion() {
  if (state.index >= TOTAL_ROUNDS || state.lives <= 0) return endGame();
  state.locked = false;
  state.current = state.queue[state.index];
  const w = state.current;
  setMascot("happy");
  el.feedback.textContent = ""; el.feedback.className = "feedback";
  el.word.textContent = ""; el.speak.hidden = true;
  el.picture.textContent = w.e;
  el.picture.classList.remove("pop"); void el.picture.offsetWidth; el.picture.classList.add("pop");
  renderHud();
  if (state.mode === "quiz") renderQuiz(); else renderScramble();
  startTimer(TIME[state.mode]);
}

function startTimer(seconds) {
  clearInterval(timerId);
  const end = Date.now() + seconds * 1000;
  state.timeLeft = seconds;
  el.bar.style.width = "100%"; el.bar.classList.remove("low");
  timerId = setInterval(() => {
    state.timeLeft = Math.max(0, (end - Date.now()) / 1000);
    const pct = (state.timeLeft / seconds) * 100;
    el.bar.style.width = pct + "%";
    el.bar.classList.toggle("low", pct < 30);
    if (state.timeLeft <= 0) { clearInterval(timerId); resolveAnswer(false, true); }
  }, 100);
}

function resolveAnswer(isCorrect, timedOut = false) {
  if (state.locked) return;
  state.locked = true;
  clearInterval(timerId);
  const w = state.current;
  el.word.textContent = w.en;
  el.speak.hidden = false;
  el.picture.classList.remove("pop"); void el.picture.offsetWidth; el.picture.classList.add("pop");

  if (isCorrect) {
    state.streak++; state.correct++;
    const gained = (state.mode === "quiz" ? 10 : 20) + Math.ceil(state.timeLeft) + Math.min(state.streak, 5) * 2;
    state.score += gained;
    el.feedback.textContent = "Hebat! +" + gained + " bintang. " + w.en + " artinya " + w.id + ".";
    el.feedback.className = "feedback good";
    sfx.ok();
    if (state.streak % 3 === 0) confetti(24);
  } else {
    state.streak = 0; state.lives--; state.missed.push(w);
    setMascot("sad");
    el.feedback.textContent = (timedOut ? "Yah, waktunya habis. " : "Ayo coba lagi! ") + "Ini namanya " + w.en + " (" + w.id + ").";
    el.feedback.className = "feedback bad";
    sfx.bad();
  }
  setTimeout(() => speakWord(w.en), 350);
  renderHud();
  state.index++;
  setTimeout(() => {
    if (state.index < TOTAL_ROUNDS && state.lives > 0) nextQuestion(); else endGame();
  }, isCorrect ? 1800 : 2800);
}

function renderQuiz() {
  const w = state.current;
  el.prompt.textContent = "Apa bahasa Inggrisnya?";
  const wrong = shuffle(pool().filter((x) => x.en !== w.en)).slice(0, 3);
  const box = document.createElement("div");
  box.className = "options";
  shuffle([w, ...wrong]).forEach((o) => {
    const b = document.createElement("button");
    b.className = "option";
    b.textContent = o.en;
    b.addEventListener("click", () => {
      if (state.locked) return;
      const ok = o.en === w.en;
      b.classList.add(ok ? "correct" : "wrong");
      box.querySelectorAll(".option").forEach((x) => {
        x.disabled = true;
        if (x.textContent === w.en) x.classList.add("correct");
      });
      resolveAnswer(ok);
    });
    box.appendChild(b);
  });
  el.area.innerHTML = "";
  el.area.appendChild(box);
}

function renderScramble() {
  const w = state.current;
  let letters = w.en.split("");
  for (let i = 0; i < 10; i++) { letters = shuffle(letters); if (letters.join("") !== w.en) break; }
  state.letters = letters; state.picked = [];
  el.prompt.textContent = "Susun huruf jadi nama gambar ini. Petunjuk: bahasa Indonesianya \"" + w.id + "\".";

  el.area.innerHTML = '<div class="slots" id="slots"></div><div class="tiles" id="tiles"></div>' +
    '<button class="btn" id="undo">Hapus huruf</button>';
  letters.forEach(() => { const s = document.createElement("div"); s.className = "slot"; $("slots").appendChild(s); });
  letters.forEach((ch, i) => {
    const t = document.createElement("button");
    t.className = "tile"; t.textContent = ch.toUpperCase();
    t.addEventListener("click", () => pickTile(i));
    $("tiles").appendChild(t);
  });
  $("undo").addEventListener("click", undoTile);
}

function paintSlots() {
  const slots = $("slots").children, tiles = $("tiles").children;
  for (let i = 0; i < slots.length; i++) {
    const idx = state.picked[i];
    slots[i].textContent = idx === undefined ? "" : state.letters[idx].toUpperCase();
    slots[i].classList.toggle("filled", idx !== undefined);
  }
  for (let i = 0; i < tiles.length; i++) tiles[i].disabled = state.picked.includes(i) || state.locked;
}
function pickTile(i) {
  if (state.locked || state.picked.includes(i)) return;
  sfx.flip();
  state.picked.push(i);
  paintSlots();
  if (state.picked.length === state.letters.length) {
    const ok = state.picked.map((k) => state.letters[k]).join("") === state.current.en;
    document.querySelectorAll(".slot").forEach((s) => s.classList.add(ok ? "correct" : "wrong"));
    resolveAnswer(ok);
    paintSlots();
  }
}
function undoTile() { if (!state.locked) { state.picked.pop(); paintSlots(); } }

document.addEventListener("keydown", (e) => {
  if (!state || state.mode !== "scramble" || state.locked || !$("game").classList.contains("active")) return;
  if (e.key === "Backspace") return undoTile();
  if (e.key.length !== 1) return;
  const i = state.letters.findIndex((ch, k) => ch === e.key.toLowerCase() && !state.picked.includes(k));
  if (i !== -1) pickTile(i);
});

// ===== Cari Pasangan =====
function startMatch() {
  const pairs = shuffle(pool()).slice(0, PAIRS);
  const cards = shuffle(pairs.flatMap((p) => [{ p, type: "pic" }, { p, type: "word" }]));
  state = { mode: "match", first: null, lock: false, moves: 0, found: 0 };
  $("moves").textContent = 0; $("found").textContent = "0/" + PAIRS;
  $("match-feedback").textContent = "Buka dua kartu. Cocokkan gambar dengan nama Inggrisnya.";
  $("match-feedback").className = "feedback";
  const grid = $("cards");
  grid.innerHTML = "";
  cards.forEach((c) => {
    const b = document.createElement("button");
    b.className = "card is-" + c.type;
    b.textContent = "?";
    b.addEventListener("click", () => flipCard(b, c));
    grid.appendChild(b);
  });
  showScreen("match");
}

function flipCard(btn, c) {
  if (state.lock || btn.classList.contains("open") || btn.classList.contains("matched")) return;
  btn.classList.add("open");
  btn.textContent = c.type === "pic" ? c.p.e : c.p.en;
  sfx.flip();
  if (!state.first) { state.first = { btn, c }; return; }

  const a = state.first;
  state.first = null;
  state.moves++;
  $("moves").textContent = state.moves;
  if (a.c.p.en === c.p.en) {
    [a.btn, btn].forEach((x) => { x.classList.remove("open"); x.classList.add("matched"); });
    state.found++;
    $("found").textContent = state.found + "/" + PAIRS;
    $("match-feedback").textContent = "Cocok! " + c.p.en + " artinya " + c.p.id + ".";
    $("match-feedback").className = "feedback good";
    sfx.ok(); speakWord(c.p.en);
    if (state.found === PAIRS) setTimeout(endMatch, 1400);
  } else {
    state.lock = true;
    $("match-feedback").textContent = "Belum cocok. Ingat posisinya, ya!";
    $("match-feedback").className = "feedback bad";
    sfx.bad();
    setTimeout(() => {
      [a.btn, btn].forEach((x) => { x.classList.remove("open"); x.textContent = "?"; });
      state.lock = false;
    }, 1000);
  }
}

function endMatch() {
  const extra = Math.max(0, state.moves - PAIRS);
  const score = Math.max(10, 100 - extra * 6);
  const stars = extra <= 2 ? 3 : extra <= 6 ? 2 : 1;
  showResult({
    title: "Hore, semua pasangan ketemu!", score, stars, mood: "happy",
    note: "Kamu butuh " + state.moves + " langkah.", missed: []
  });
}

// ===== Hasil =====
function endGame() {
  clearInterval(timerId);
  const finished = state.lives > 0;
  const stars = state.correct >= 9 ? 3 : state.correct >= 6 ? 2 : 1;
  showResult({
    title: finished ? "Hore, selesai!" : "Yah, nyawa habis",
    score: state.score, stars, mood: finished ? "happy" : "sad",
    note: state.correct + " dari " + state.index + " soal benar.", missed: state.missed
  });
}

function showResult({ title, score, stars, mood, note, missed }) {
  const mode = state.mode;
  const newBest = score > getBest(mode);
  if (newBest) save("best-" + mode, score);
  setMascot(mood);
  $("result-title").textContent = title;
  $("stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  $("final-score").textContent = score;
  $("result-note").textContent = note + (newBest ? " Wah, bintang terbanyakmu yang baru!" : "");

  const box = $("review");
  box.innerHTML = "";
  if (missed.length) {
    const h = document.createElement("h3");
    h.textContent = "Yuk ulangi kata ini:";
    const ul = document.createElement("ul");
    missed.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = m.e + " ";
      const b = document.createElement("b"); b.textContent = m.en;
      li.append(b, " = " + m.id);
      ul.appendChild(li);
    });
    box.append(h, ul);
    box.hidden = false;
  } else {
    box.hidden = true;
  }
  showScreen("result");
  if (mood === "happy") { sfx.win(); confetti(40); }
}

// ===== Tombol =====
document.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => startMode(b.dataset.mode)));
document.querySelectorAll(".chip").forEach((c) =>
  c.addEventListener("click", () => { category = c.dataset.cat; save("cat", category); sfx.flip(); renderMenu(); })
);
$("sound").addEventListener("click", () => {
  soundOn = !soundOn; save("sound", soundOn ? "on" : "off");
  if (!soundOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
  renderMenu();
});
$("again").addEventListener("click", () => startMode(state.mode));
$("home").addEventListener("click", () => { renderMenu(); showScreen("menu"); });
$("match-quit").addEventListener("click", () => { renderMenu(); showScreen("menu"); });
el.speak.addEventListener("click", () => speakWord(state.current.en));

renderMenu();
