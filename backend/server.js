const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Quiz Data - You can expand this list
const quizQuestions = [
    {
        question: "Which city is the financial capital of India?",
        options: ["Mumbai", "Delhi", "Chennai", "Kolkata"],
        correct: 0 // Mumbai
    },
    {
        question: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        correct: 1 // Mars
    },
    {
        question: "What is the capital of France?",
        options: ["Berlin", "Madrid", "Paris", "Rome"],
        correct: 2 // Paris
    }
];

// In-memory storage for rooms
const rooms = {}; 
const QUESTION_TIME_LIMIT = 30; // seconds

// Join Room
app.post('/join', (req, res) => {
    const { roomCode, username } = req.body;
    if (!roomCode || !username) return res.status(400).json({ error: "Missing data" });

    if (!rooms[roomCode]) {
        rooms[roomCode] = {
            players: {},
            answers: {},
            currentQuestionIndex: 0,
            startTime: Date.now(),
            status: 'waiting' // 'waiting' or 'revealing'
        };
    }

    const userId = Math.random().toString(36).substring(7);
    rooms[roomCode].players[userId] = { name: username, answered: false };
    
    res.json({ userId, roomCode });
});

// Submit Answer
app.post('/submit-answer', (req, res) => {
    const { roomCode, userId, answerIndex } = req.body;
    const room = rooms[roomCode];

    if (!room || !room.players[userId]) return res.status(404).json({ error: "Invalid Room/User" });

    room.answers[userId] = answerIndex;
    room.players[userId].answered = true;

    res.json({ success: true });
});

// Get Quiz Status (Polled every 1s)
app.get('/quiz-status', (req, res) => {
    const roomCode = req.query.roomCode;
    const room = rooms[roomCode];

    if (!room) return res.status(404).json({ error: "Room not found" });

    const currentQuestion = quizQuestions[room.currentQuestionIndex];
    const totalPlayers = Object.keys(room.players).length;
    const playersWhoAnswered = Object.values(room.players).filter(p => p.answered).length;
    
    const timeElapsed = Math.floor((Date.now() - room.startTime) / 1000);
    const timeLeft = Math.max(0, QUESTION_TIME_LIMIT - timeElapsed);

    // Auto-reveal logic: All players answered OR timer finished
    if (playersWhoAnswered === totalPlayers || timeLeft === 0) {
        room.status = 'revealing';
    } else {
        room.status = 'answering';
    }

    // Prepare the response
    res.json({
        status: room.status,
        question: currentQuestion.question,
        options: currentQuestion.options,
        correctIndex: room.status === 'revealing' ? currentQuestion.correct : null,
        timeLeft: timeLeft,
        answers: room.answers, // {userId: index}
        players: room.players,  // {userId: {name, answered}}
        currentQuestionIndex: room.currentQuestionIndex
    });
});

// Reset for next question (Admin/Trigger)
app.post('/next-question', (req, res) => {
    const { roomCode } = req.body;
    const room = rooms[roomCode];
    if (room) {
        room.currentQuestionIndex++;
        room.startTime = Date.now();
        room.status = 'answering';
        room.answers = {};
        Object.keys(room.players).forEach(id => room.players[id].answered = false);
    }
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
