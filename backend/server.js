const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const rooms = {}; 
const QUESTION_TIME_LIMIT = 30;

// 1. CREATE ROOM (New Feature)
app.post('/create-room', (req, res) => {
    const { username, subject, topic, setIndex } = req.body;
    if (!username || !subject || !topic || setIndex === undefined) {
        return res.status(400).json({ error: "Missing quiz details" });
    }

    // Generate unique 6-character room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const shuffleSeed = Math.floor(Math.random() * 1000000); // For identical randomization

    rooms[roomCode] = {
        creator: username,
        subject: subject,
        topic: topic,
        setIndex: setIndex,
        seed: shuffleSeed,
        players: {},
        answers: {},
        currentQuestionIndex: 0,
        startTime: Date.now(),
        status: 'waiting'
    };

    const userId = Math.random().toString(36).substring(7);
    rooms[roomCode].players[userId] = { name: username, answered: false };

    res.json({ roomCode, userId, shuffleSeed });
});

// 2. JOIN ROOM
app.post('/join', (req, res) => {
    const { roomCode, username } = req.body;
    const room = rooms[roomCode];
    if (!room) return res.status(404).json({ error: "Room not found" });

    const userId = Math.random().toString(36).substring(7);
    room.players[userId] = { name: username, answered: false };

    res.json({ 
        userId, 
        roomCode, 
        shuffleSeed: room.seed, 
        subject: room.subject, 
        topic: room.topic, 
        setIndex: room.setIndex 
    });
});

// 3. SUBMIT ANSWER
app.post('/submit-answer', (req, res) => {
    const { roomCode, userId, answerIndex } = req.body;
    const room = rooms[roomCode];
    if (!room || !room.players[userId]) return res.status(404).json({ error: "Invalid" });

    room.answers[userId] = answerIndex;
    room.players[userId].answered = true;
    res.json({ success: true });
});

// 4. QUIZ STATUS
app.get('/quiz-status', (req, res) => {
    const roomCode = req.query.roomCode;
    const room = rooms[roomCode];
    if (!room) return res.status(404).json({ error: "Room not found" });

    const totalPlayers = Object.keys(room.players).length;
    const playersWhoAnswered = Object.values(room.players).filter(p => p.answered).length;
    const timeLeft = Math.max(0, QUESTION_TIME_LIMIT - Math.floor((Date.now() - room.startTime) / 1000));

    if (playersWhoAnswered === totalPlayers || timeLeft === 0) {
        room.status = 'revealing';
    } else {
        room.status = 'answering';
    }

    res.json({
        status: room.status,
        timeLeft: timeLeft,
        currentQuestionIndex: room.currentQuestionIndex,
        answers: room.answers,
        players: room.players
    });
});

// 5. NEXT QUESTION
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
