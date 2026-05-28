const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// In-memory storage (Note: This resets every time Render restarts/sleeps)
const rooms = {}; 
const QUESTION_TIME_LIMIT = 30; // seconds per question

// HEALTH CHECK: Visit your-url.onrender.com/ in browser to see if server is alive
app.get('/', (req, res) => {
    console.log("Health check ping received");
    res.send("EduQuiz Backend is Online! 🚀");
});

// 1. CREATE ROOM
app.post('/create-room', (req, res) => {
    const { username, subject, topic, setIndex } = req.body;
    console.log(`Creating room for ${username} - Subject: ${subject}, Topic: ${topic}`);
    
    if (!username || !subject || !topic || setIndex === undefined) {
        console.log("Create room failed: Missing parameters");
        return res.status(400).json({ error: "Missing quiz details" });
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
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
        startTime: null,
        status: 'waiting'
    };

    rooms[roomCode].players[creatorId] = { name: username, answered: false };
    console.log(`Room created successfully! Code: ${roomCode}`);

    res.json({ 
        roomCode: roomCode, 
        userId: creatorId, 
        shuffleSeed: shuffleSeed 
    });
});

// 2. START QUIZ
app.post('/start-quiz', (req, res) => {
    const { roomCode, userId } = req.body;
    const room = rooms[roomCode];

    if (!room) {
        console.log(`Start quiz failed: Room ${roomCode} not found`);
        return res.status(404).json({ error: "Room not found" });
    }
    
    if (userId !== room.creatorId) {
        console.log(`Start quiz failed: User ${userId} is not the creator`);
        return res.status(403).json({ error: "Only the room creator can start the quiz" });
    }

    room.status = 'answering';
    room.startTime = Date.now();
    console.log(`Quiz started for room ${roomCode}`);
    res.json({ success: true });
});

// 3. JOIN ROOM
app.post('/join', (req, res) => {
    const { roomCode, username } = req.body;
    console.log(`User ${username} attempting to join room ${roomCode}`);
    const room = rooms[roomCode];

    if (!room) {
        console.log(`Join failed: Room ${roomCode} does not exist (possibly server restarted)`);
        return res.status(404).json({ error: "Room not found" });
    }

    const userId = Math.random().toString(36).substring(7);
    room.players[userId] = { name: username, answered: false };

    console.log(`User ${username} joined room ${roomCode}. Total players: ${Object.keys(room.players).length}`);
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

    if (!room || !room.players[userId]) {
        return res.status(404).json({ error: "Invalid Room/User" });
    }

    room.answers[userId] = answerIndex;
    room.players[userId].answered = true;
    res.json({ success: true });
});

// 5. GET QUIZ STATUS
app.get('/quiz-status', (req, res) => {
    const roomCode = req.query.roomCode;
    const room = rooms[roomCode];

    if (!room) return res.status(404).json({ error: "Room not found" });

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

// 6. NEXT QUESTION
app.post('/next-question', (req, res) => {
    const { roomCode, userId } = req.body;
    const room = rooms[roomCode];

    if (!room) return res.status(404).json({ error: "Room not found" });
    
    if (userId !== room.creatorId) {
        return res.status(403).json({ error: "Only the room creator can move to the next question" });
    }

    room.currentQuestionIndex++;
    room.startTime = Date.now();
    room.status = 'answering';
    room.answers = {}; 
    Object.keys(room.players).forEach(id => room.players[id].answered = false);

    console.log(`Room ${roomCode} moved to question ${room.currentQuestionIndex}`);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`EduQuiz Backend running on port ${PORT}`);
    console.log(`Server Status: Online`);
    console.log(`--------------------------------------------------`);
});
