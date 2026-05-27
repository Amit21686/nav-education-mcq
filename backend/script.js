const API_URL = 'https://my-quiz-backend-f43f.onrender.com'; // <--- REPLACE THIS
const userId = localStorage.getItem('quiz_userId');
const roomCode = localStorage.getItem('quiz_roomCode');

let mySelectedAnswer = null;

// Initialize the game
window.onload = () => {
    if(!userId || !roomCode) {
        window.location.href = 'index.html';
    }
    document.getElementById('display-room').innerText = roomCode;
    
    // Start polling immediately
    fetchStatus();
    setInterval(fetchStatus, 1000);
};

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
    
    // Toggle the "Next Question" button visibility
    const nextBtnContainer = document.getElementById('next-btn-container');
    if (isRevealing) {
        nextBtnContainer.classList.remove('hidden');
    } else {
        nextBtnContainer.classList.add('hidden');
    }

    data.options.forEach((opt, index) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        
        if (isRevealing) {
            // Result Phase: apply Green/Red colors
            if (index === data.correctIndex) {
                btn.classList.add('correct');
            } else if (index === mySelectedAnswer) {
                btn.classList.add('wrong');
            }
        } else {
            // Answering Phase: apply Blue selection
            if (index === mySelectedAnswer) {
                btn.classList.add('selected');
            }
            btn.onclick = () => selectAnswer(index);
        }

        // Find which users chose this specific option
        let usersWhoChose = [];
        for (let id in data.answers) {
            if (data.answers[id] === index) {
                const player = data.players[id];
                if (player) usersWhoChose.push(player.name);
            }
        }

        btn.innerHTML = `
            <div>
                <strong>${String.fromCharCode(65 + index)}. ${opt}</strong> 
                ${isRevealing && index === data.correctIndex ? ' ✅' : ''}
            </div>
            <div class="user-list">
                ${usersWhoChose.length > 0 ? '👤 ' + usersWhoChose.join(', ') : ''}
            </div>
        `;
        container.appendChild(btn);
    });

    // Update Waiting Area
    const waitingArea = document.getElementById('waiting-area');
    const pendingList = document.getElementById('pending-players');
    pendingList.innerHTML = '';

    if (isRevealing) {
        waitingArea.innerHTML = "<h3>Check the results above! 👆</h3>";
    } else {
        const pendingPlayers = Object.values(data.players).filter(p => !p.answered);
        if (pendingPlayers.length === 0) {
            waitingArea.innerHTML = "<h3>🎉 All players answered! Revealing...</h3>";
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
        console.error("Error submitting answer:", e);
    }
}

async function nextQuestion() {
    mySelectedAnswer = null;
    try {
        const res = await fetch(`${API_URL}/next-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomCode })
        });
        if (res.ok) {
            fetchStatus(); // Refresh UI immediately
        }
    } catch (e) {
        console.error("Error moving to next question:", e);
    }
    }
