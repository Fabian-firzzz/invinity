// Mode configuration
const MODES = {
    easy: { steps: 30, name: '🟢 Easy' },
    normal: { steps: 22, name: '🔵 Normal' },
    hard: { steps: 16, name: '🔴 Hard' },
    impossible: { steps: 10, name: '💀 Impossible' }
};

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const modeSelector = document.getElementById('modeSelector');
    const difficultyInfo = document.getElementById('difficultyInfo');
    const modeNameEl = document.getElementById('modeName');
    const difficultyMaxStepsEl = document.getElementById('difficultyMaxSteps');
    const gameBoardEl = document.getElementById('gameBoard');
    const boardEl = document.getElementById('board');
    const stepEl = document.getElementById('stepCount');
    const maxStepsEl = document.getElementById('maxSteps');
    const statusEl = document.getElementById('gameStatus');
    const resetBtn = document.getElementById('resetBtn');
    const changeModeBtn = document.getElementById('changeModeBtn');
    const surrenderBtn = document.getElementById('surrenderBtn');
    const modeBtns = document.querySelectorAll('.mode-btn');

    // Game State
    const symbols = ['♣','♥'];
    const values = ['A','K','Q','J','10','9','8','7']; // 8 pairs -> 16 cards

    let selectedMode = null;
    let MAX_STEPS = 0;
    let deck = [];
    let opened = [];
    let matched = new Set();
    let steps = 0;

    // Mode Selection Handler
    function selectMode(mode) {
        selectedMode = mode;
        MAX_STEPS = MODES[mode].steps;

        // Update UI: hide mode selector, show game
        modeSelector.style.display = 'none';
        difficultyInfo.style.display = 'block';
        gameBoardEl.style.display = 'block';
        gameBoardEl.classList.remove('disabled');

        // Update difficulty info
        modeNameEl.textContent = MODES[mode].name;
        difficultyMaxStepsEl.textContent = MAX_STEPS;
        maxStepsEl.textContent = MAX_STEPS;

        // Initialize game
        resetGame();
    }

    // Mode button listeners
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => b.classList.remove('active'));
            e.target.closest('.mode-btn').classList.add('active');
            const mode = e.target.closest('.mode-btn').dataset.mode;
            selectMode(mode);
        });
    });

    // Change Mode handler
    if (changeModeBtn) {
        changeModeBtn.addEventListener('click', () => {
            // Reset to mode selector
            modeSelector.style.display = 'grid';
            difficultyInfo.style.display = 'none';
            gameBoardEl.style.display = 'none';
            gameBoardEl.classList.add('disabled');

            // Clear active state from buttons
            modeBtns.forEach(b => b.classList.remove('active'));

            // Reset game state
            opened = [];
            matched = new Set();
            steps = 0;
            selectedMode = null;
            MAX_STEPS = 0;
        });
    }

    function makeDeck() {
        deck = [];
        for (let i = 0; i < values.length; i++) {
            const val = values[i];
            const sym = symbols[i % symbols.length];
            const id = `${sym}${val}`;
            // pair: two identical cards
            deck.push({ id, label: `${sym} ${val}` });
            deck.push({ id, label: `${sym} ${val}` });
        }
        // shuffle
        for (let i = deck.length -1; i>0; i--) {
            const j = Math.floor(Math.random()*(i+1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    function render() {
        boardEl.innerHTML = '';
        deck.forEach((card, idx) => {
            const cardWrap = document.createElement('div');
            cardWrap.className = 'card';
            cardWrap.dataset.index = idx;

            const inner = document.createElement('div');
            inner.className = 'card-inner';

            const front = document.createElement('div');
            front.className = 'card-face card-front';
            front.textContent = '?';

            const back = document.createElement('div');
            back.className = 'card-face card-back';
            back.textContent = card.label;

            inner.appendChild(front);
            inner.appendChild(back);
            cardWrap.appendChild(inner);

            if (matched.has(card.id)) {
                cardWrap.classList.add('flipped');
            }

            cardWrap.addEventListener('click', () => onCardClick(idx, card));
            boardEl.appendChild(cardWrap);
        });
        stepEl.textContent = steps;
        updateStatus();
    }

    function onCardClick(index, card) {
        const cardEls = boardEl.querySelectorAll('.card');
        if (opened.length >= 2) return; // wait
        if (matched.has(card.id)) return; // already matched
        const el = cardEls[index];
        if (el.classList.contains('flipped')) return;

        el.classList.add('flipped');
        opened.push({ index, card });

        if (opened.length === 2) {
            // count 1 step for 2 flips
            steps += 1; stepEl.textContent = steps;
            const [a,b] = opened;
            if (a.card.id === b.card.id) {
                // match
                matched.add(a.card.id);
                opened = [];
                checkWinLose();
            } else {
                // not match -> flip back after 1s
                setTimeout(() => {
                    const aEl = boardEl.querySelector(`.card[data-index='${a.index}']`);
                    const bEl = boardEl.querySelector(`.card[data-index='${b.index}']`);
                    if (aEl) aEl.classList.remove('flipped');
                    if (bEl) bEl.classList.remove('flipped');
                    opened = [];
                    checkWinLose();
                }, 1000);
            }
        }
    }

    function checkWinLose() {
        if (matched.size === values.length) {
            statusEl.textContent = 'MENANG';
            statusEl.classList.add('win');
            statusEl.classList.remove('lose');
            setTimeout(() => alert(`🎉 Selamat! Anda menang dengan ${steps} langkah pada mode ${MODES[selectedMode].name}!`), 200);
        } else if (steps >= MAX_STEPS) {
            statusEl.textContent = 'KALAH';
            statusEl.classList.add('lose');
            statusEl.classList.remove('win');
            setTimeout(() => {
                alert(`😢 Langkah habis! Anda mencapai ${steps}/${MAX_STEPS} langkah.`);
                resetGame();
            }, 200);
        } else {
            updateStatus();
        }
    }

    function updateStatus() {
        if (matched.size === values.length) return;
        statusEl.textContent = 'Berlangsung';
        statusEl.classList.remove('win', 'lose');
    }

    function resetGame() {
        opened = [];
        matched = new Set();
        steps = 0;
        makeDeck();
        render();
    }

    resetBtn.addEventListener('click', resetGame);

    surrenderBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin menyerah dan kembali ke beranda?')) {
            window.location.href = 'index.html';
        }
    });

    // init - show mode selector by default
    modeSelector.style.display = 'grid';
    difficultyInfo.style.display = 'none';
    gameBoardEl.style.display = 'none';
});
