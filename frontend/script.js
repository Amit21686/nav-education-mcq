const API_URL = 'http://localhost:3000';
const userId = localStorage.getItem('quiz_userId');
const roomCode = localStorage.getItem('quiz_roomCode');

let mySelectedAnswer = null;

document.getElementById('display-room').innerText = roomCode;

async function fetchStatus() {
    try {
        const res = await fetch(`${API_URL}/quiz-status?roomCode=${roomCode}`);
        const data = await res.json();

        updateUI(data);
    } catch (err) {
        console.error("Error fetching status:", err);
    }
}

function updateUI(data) {
    document.getElementById('timer').innerText = data.timeLeft;
    document.getElementById('question-text').innerText = data.question;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    // Handle reveal state
    const isRevealing = data.status === 'revealing';
    if (isRevealing) {
        document.getElementById('result-overlay').classList.remove('hidden');
    } else {
        document.getElementById('result-overlay').classList.add('hidden');
    }

    data.options.forEach((opt, index) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        
        // Color Logic for Results
        if (isRevealing) {
            if (index === data.correctIndex) btn.classList.add('correct');
            else if (index === mySelectedAnswer) btn.classList.add('wrong');
        } else {
            if (index === mySelectedAnswer) btn.classList.add('selected');
            btn.onclick = () => selectAnswer(index);
        }

        // Display users who chose this option
        let usersWhoChose = [];
        for (let id in data.answers) {
            if (data.answers[id] === index) {
                usersWhoChose.push(data.players[id].name);
            }
        }

        btn.innerHTML = `
            <strong>${String.fromCharCode(65 + index)}. ${opt}</strong> ${isRevealing && index === data.correctIndex ? ' ✅' : ''}
            <span class="user-list">${usersWhoChose.join(', ')}</span>
        `;
        container.appendChild(btn);
    });

    // Update Waiting List
    const pendingList = document.getElementById('pending-players');
    pendingList.innerHTML = '';
    
    const pendingPlayers = Object.values(data.players).filter(p => !p.answered);
    
    if (pendingPlayers.length === 0 && !isRevealing) {
        document.getElementById('waiting-area').innerHTML = "<h3>All Players Answered!</h3>";
    } else {
        document.getElementById('waiting-area').innerHTML = "<h3>Waiting for:</h3>";
        pendingPlayers.forEach(p => {
            const li = document.createElement('li');
            li.innerText = p.name;
            pendingList.appendChild(li);
        });
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

// Poll every 1 second
setInterval(fetchStatus, 1000);
fetchStatus();
