const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// In-memory storage for active rooms
const rooms = {}; 
const QUESTION_TIME_LIMIT = 30; // seconds per question

// 1. CREATE ROOM (Called by the Host)
app.post('/create-room', (req, res) => {
    const { username, subject, topic, setIndex } = req.body;
    
    if (!username || !subject || !topic || setIndex === undefined) {
        return res.status(400).json({ error: "Missing quiz details" });
    }

    // Generate unique 6-character room code (e.g., XJ4K9L)
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Generate a shuffle seed to ensure all players get the same question order
    const shuffleSeed = Math.floor(Math.random() * 1000000);

    const creatorId = Math.random().toString(36).substring(7);

    rooms[roomCode] = {
        creatorId: creatorId,
        creatorName: username,
        subject: subject,
        topic: topic,
        setIndex: setIndex,
        seed: shuffleSeed,
        players: {},
        answers: {},
        currentQuestionIndex: 0,
        startTime: null, // Set only when host starts the quiz
        status: 'waiting' // 'waiting', 'answering', 'revealing'
    };

    // Add creator as the first player
    rooms[roomCode].players[creatorId] = { name: username, answered: false };

    res.json({ 
        roomCode: roomCode, 
        userId: creatorId, 
        shuffleSeed: shuffleSeed 
    });
});

// 2. START QUIZ (Called only by the Host)
app.post('/start-quiz', (req, res) => {
    const { roomCode, userId } = req.body;
    const room = rooms[roomCode];

    if (!room) return res.status(404).json({ error: "Room not found" });
    
    // Security check: Only the creator can start the game
    if (userId !== room.creatorId) {
        return res.status(403).json({ error: "Only the room creator can start the quiz" });
    }

    room.status = 'answering';
    room.startTime = Date.now();
    res.json({ success: true });
});

// 3. JOIN ROOM (Called by Students)
app.post('/join', (req, res) => {
    const { roomCode, username } = req.body;
    const room = rooms[roomCode];

    if (!room) return res.status(404).json({ error: "Room not found" });

    const userId = Math.random().toString(36).substring(7);
    room.players[userId] = { name: username, answered: false };

    res.json({ 
        userId: userId, 
        roomCode: roomCode, 
        shuffleSeed: room.seed, 
        subject: room.subject, 
        topic: room.topic, 
        setIndex: room.setIndex 
    });
});

// 4. SUBMIT ANSWER
app.post('/submit-answer', (req, res) => {
    const { roomCode, userId, answerIndex } = req.body;
    const room = rooms[roomCode];

    if (!room || !room.players[userId]) return res.status(404).json({ error: "Invalid Room/User" });

    room.answers[userId] = answerIndex;
    room.players[userId].answered = true;

    res.json({ success: true });
});

// 5. GET QUIZ STATUS (Polled every 1s by all players)
app.get('/quiz-status', (req, res) => {
    const roomCode = req.query.roomCode;
    const room = rooms[roomCode];

    if (!room) return res.status(404).json({ error: "Room not found" });

    // If host hasn't started yet, just send the player list
    if (room.status === 'waiting') {
        return res.json({ 
            status: 'waiting', 
            players: room.players 
        });
    }

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

    res.json({
        status: room.status,
        timeLeft: timeLeft,
        currentQuestionIndex: room.currentQuestionIndex,
        answers: room.answers,
        players: room.players
    });
});

// 6. NEXT QUESTION (Called only by the Host)
app.post('/next-question', (req, res) => {
    const { roomCode, userId } = req.body;
    const room = rooms[roomCode];

    if (!room) return res.status(404).json({ error: "Room not found" });
    
    // Security check: Only the creator can move to the next question
    if (userId !== room.creatorId) {
        return res.status(403).json({ error: "Only the room creator can move to the next question" });
    }

    room.currentQuestionIndex++;
    room.startTime = Date.now();
    room.status = 'answering';
    room.answers = {}; // Reset answers for the new question
    Object.keys(room.players).forEach(id => room.players[id].answered = false);

    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Multiplayer Backend running on port ${PORT}`));
