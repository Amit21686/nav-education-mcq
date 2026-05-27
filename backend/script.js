const API_URL = 'https://my-quiz-backend-f43f.onrender.com'; // <--- REPLACE THIS
const userId = localStorage.getItem('quiz_userId');
const roomCode = localStorage.getItem('quiz_roomCode');

let mySelectedAnswer = null;

// Initial setup
window.onload = () => {
    if(!userId || !roomCode) {
        window.location.href = 'index.html';
    }
    document.getElementById('display-room').innerText = roomCode;
    fetchStatus();
    setInterval(fetchStatus, 1000);
};

async function fetchStatus() {
    try {
        const res = await fetch(`${API_URL}/quiz-status?roomCode=${roomCode}`);
        if (!res.ok) throw new Error("Server Error");
        const data = await res.json();
        updateUI(data);
    } catch (err) {
        // If it's stuck on "Loading...", this alert will tell us why
        console.error("Fetch error:", err);
    }
}

function updateUI(data) {
    document.getElementById('timer').innerText = data.timeLeft;
    document.getElementById('question-text').innerText = data.question;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    const isRevealing = data.status === 'revealing';
    const overlay = document.getElementById('result-overlay');
    
    if (isRevealing) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');

    data.options.forEach((opt, index) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        
        if (isRevealing) {
            if (index === data.correctIndex) btn.classList.add('correct');
            else if (index === mySelectedAnswer) btn.classList.add('wrong');
        } else {
            if (index === mySelectedAnswer) btn.classList.add('selected');
            btn.onclick = () => selectAnswer(index);
        }

        let usersWhoChose = [];
        for (let id in data.answers) {
            if (data.answers[id] === index) {
                usersWhoChose.push(data.players[id].name);
            }
        }

        btn.innerHTML = `
            <div><strong>${String.fromCharCode(65 + index)}. ${opt}</strong> ${isRevealing && index === data.correctIndex ? ' ✅' : ''}</div>
            <div class="user-list">${usersWhoChose.length > 0 ? '👤 ' + usersWhoChose.join(', ') : ''}</div>
        `;
        container.appendChild(btn);
    });

    const waitingArea = document.getElementById('waiting-area');
    const pendingList = document.getElementById('pending-players');
    pendingList.innerHTML = '';

    if (isRevealing) {
        waitingArea.innerHTML = "<h3>Results Revealed!</h3>";
    } else {
        const pending = Object.values(data.players).filter(p => !p.answered);
        if (pending.length === 0) {
            waitingArea.innerHTML = "<h3>🎉 All answered! Revealing soon...</h3>";
        } else {
            waitingArea.innerHTML = "<h3>Waiting for:</h3>";
            pending.forEach(p => {
                const li = document.createElement('li');
                li.innerText = p.name;
                pendingList.appendChild(li);
            });
        }
    }
}

async function selectAnswer(index) {
    mySelectedAnswer = index;
    await fetch(`${API_URL}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, userId, answerIndex: index })
    });
}

async function nextQuestion() {
    mySelectedAnswer = null;
    await fetch(`${API_URL}/next-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode })
    });
}
