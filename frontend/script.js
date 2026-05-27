const API_URL = 'https://my-quiz-backend-f43f.onrender.com'; // <--- CHANGE THIS
const userId = localStorage.getItem('quiz_userId');
const roomCode = localStorage.getItem('quiz_roomCode');

let mySelectedAnswer = null;

document.getElementById('display-room').innerText = roomCode;

async function fetchStatus() {
    try {
        const res = await fetch(`${API_URL}/quiz-status?roomCode=${roomCode}`);
        if (!res.ok) return;
        const data = await res.json();
        updateUI(data);
    } catch (err) {
        console.error("Polling error:", err);
    }
}

function updateUI(data) {
    document.getElementById('timer').innerText = data.timeLeft;
    document.getElementById('question-text').innerText = data.question;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    const isRevealing = data.status === 'revealing';

    // Show/Hide the "Next Question" Overlay
    const overlay = document.getElementById('result-overlay');
    if (isRevealing) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }

    data.options.forEach((opt, index) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        
        if (isRevealing) {
            // RESULT PHASE
            if (index === data.correctIndex) {
                btn.classList.add('correct');
            } else if (index === mySelectedAnswer) {
                btn.classList.add('wrong');
            }
        } else {
            // ANSWERING PHASE
            if (index === mySelectedAnswer) {
                btn.classList.add('selected');
            }
            btn.onclick = () => selectAnswer(index);
        }

        // Find all users who picked this option
        let usersWhoChose = [];
        for (let id in data.answers) {
            if (data.answers[id] === index) {
                const playerName = data.players[id] ? data.players[id].name : "Unknown";
                usersWhoChose.push(playerName);
            }
        }

        btn.innerHTML = `
            <div>
                <strong>${String.fromCharCode(65 + index)}. ${opt}</strong>
                ${isRevealing && index === data.correctIndex ? ' ✅' : ''}
            </div>
            <span class="user-list">
                ${usersWhoChose.length > 0 ? '👤 ' + usersWhoChose.join(', ') : ''}
            </span>
        `;
        container.appendChild(btn);
    });

    // Handle "Waiting for players" section
    const waitingArea = document.getElementById('waiting-area');
    const pendingList = document.getElementById('pending-players');
    pendingList.innerHTML = '';

    if (isRevealing) {
        waitingArea.innerHTML = "<h3>Results Revealed!</h3>";
    } else {
        const pendingPlayers = Object.values(data.players).filter(p => !p.answered);
        if (pendingPlayers.length === 0) {
            waitingArea.innerHTML = "<h3>🎉 All players answered! Revealing soon...</h3>";
        } else {
            waitingArea.innerHTML = "<h3>Waiting for:</h3>";
            pendingPlayers.forEach(p => {
                const li = document.createElement('li');
                li.innerText = p.name;
                pendingList.appendChild(li);
            });
        }
    }
}

async function selectAnswer(index) {
    mySelectedAnswer = index;
    try {
        await fetch(`${API_URL}/submit-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomCode, userId, answerIndex: index })
        });
    } catch (e) {
        alert("Failed to submit answer");
    }
}

async function nextQuestion() {
    // Reset local selection
    mySelectedAnswer = null;
    try {
        const res = await fetch(`${API_URL}/next-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomCode })
        });
        if (res.ok) {
            // Force an immediate update after moving to next question
            fetchStatus();
        }
    } catch (e) {
        alert("Error moving to next question");
    }
}

// Poll every 1 second
setInterval(fetchStatus, 1000);
fetchStatus();
