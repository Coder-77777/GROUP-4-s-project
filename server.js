/*
    server.js — EdTech Quiz Generator (backend)

    Purpose:
    - Express-based API that handles user authentication, quiz generation,
        quiz result persistence, and leaderboard/dashboard endpoints.
    - Uses `mongoose` to persist users and quiz history in MongoDB.
    - Uses JWT for stateless authentication; `JWT_SECRET` is read from env.
    - Integrates with Gemini AI when available, but falls back to a
        lightweight placeholder generator to ensure the server always starts.

    Developer notes:
    - These comments are for developers only and are not sent to clients.
    - Do not remove the static file serving or SPA fallback unless you
        understand how it affects API routing (static is served after API).
        Courtesy of ADJAI DEVELOPERS. Copyright 2026.
*/

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "change-this-secret";


/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(cors());

app.use(express.json({
    limit: "10mb"
}));

app.use(express.urlencoded({
    extended: true
}));

/* =====================================================
   DATABASE CONNECTION
===================================================== */

let dbReady = false;
const inMemoryStore = {
    users: []
};

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/group4_db")
.then(() => {
    dbReady = true;
    console.log("MongoDB Connected");
})
.catch((err) => {
    dbReady = false;
    console.error("MongoDB Error:", err);
    console.warn("Continuing with in-memory storage for development.");
});

/* =====================================================
   USER MODEL
===================================================== */

const QuizHistorySchema = new mongoose.Schema({
    score: {
        type: Number,
        default: 0
    },

    total: {
        type: Number,
        default: 0
    },

    percentage: {
        type: Number,
        default: 0
    },

    difficulty: {
        type: String,
        default: "Medium"
    },

    topic: {
        type: String,
        default: "General"
    },

    duration: {
        type: Number,
        default: 0
    },

    completedAt: {
        type: Date,
        default: Date.now
    }
});

const UserSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    quizHistory: [QuizHistorySchema]

});

const User = mongoose.model("User", UserSchema);

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function findUserByEmail(email) {
    if (dbReady) {
        return User.findOne({ email });
    }
    return inMemoryStore.users.find((user) => user.email === email) || null;
}

async function findUserById(id) {
    if (dbReady) {
        return User.findById(id);
    }
    return inMemoryStore.users.find((user) => user.id === id) || null;
}

async function createNewUser({ username, email, password }) {
    if (dbReady) {
        return User.create({ username, email, password, quizHistory: [] });
    }

    const newUser = {
        id: generateId(),
        username,
        email,
        password,
        quizHistory: []
    };

    inMemoryStore.users.push(newUser);
    return newUser;
}

async function saveUser(user) {
    if (dbReady) {
        return user.save();
    }
    return user;
}

async function findAllUsers() {
    if (dbReady) {
        return User.find();
    }
    return inMemoryStore.users;
}

function findQuizById(user, quizId) {
    if (!user || !user.quizHistory) return null;
    if (dbReady && typeof user.quizHistory.id === "function") {
        return user.quizHistory.id(quizId);
    }
    return user.quizHistory.find((quiz) => quiz.id === quizId || quiz._id?.toString() === quizId) || null;
}

function createQuizResult({ score, total, percentage, difficulty, topic, duration }) {
    return {
        id: generateId(),
        score,
        total,
        percentage,
        difficulty,
        topic,
        duration,
        completedAt: new Date()
    };
}

/* =====================================================
   JWT AUTH MIDDLEWARE
===================================================== */

const verifyToken = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access denied"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token missing"
            });
        }

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });

    }

};

/* =====================================================
   HELPER FUNCTIONS
===================================================== */
const validateEmail = (email) => {
    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const calculateAverageScore = (history) => {

    if (!history.length) return 0;

    const total = history.reduce((sum, quiz) => {
        return sum + quiz.percentage;
    }, 0);

    return (
        total /
        history.length
    ).toFixed(2);

};

const calculateHighestScore = (history) => {

    if (!history.length) return 0;

    return Math.max(
        ...history.map(
            quiz => quiz.percentage
        )
    );

};

const calculateTotalQuizzes = (history) => {
    return history.length;
};

/* =====================================================
   GEMINI QUIZ GENERATION PLACEHOLDER
===================================================== */

function generateQuizPlaceholder(
    syllabusText,
    difficulty,
    questionCount
) {

    /*
       PART 2 will contain
       the real Gemini integration.

       This placeholder ensures
       server startup doesn't fail.
    */

    const sampleQuiz = [];

    for (let i = 1; i <= questionCount; i++) {

        sampleQuiz.push({

            question:
                `Sample ${difficulty} Question ${i}`,

            options: [
                "Option A",
                "Option B",
                "Option C",
                "Option D"
            ],

            answer: 0,

            explanation:
                "Placeholder explanation."

        });

    }

    return sampleQuiz;

}

/* =====================================================
   HEALTH CHECK AND SPA ROUTING
===================================================== */

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        app: "EdTech Quiz Generator",
        status: "Running",
        database: dbReady ? "connected" : "fallback"
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =====================================================
   AUTH ROUTES START HERE
===================================================== */
/* =====================================================
   REGISTER USER
===================================================== */

app.post("/register", async (req, res) => {

    try {

        const {
            username,
            email,
            password
        } = req.body;
        if (!validateEmail(email)) {
    return res.status(400).json({
        success: false,
        message: "Invalid email format"
    });}


    if (
            !username ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const existingUser =
            await findUserByEmail(email);

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        const salt =
            await bcrypt.genSalt(10);

        const hashedPassword =
            await bcrypt.hash(
                password,
                salt
            );

        const newUser =
            await createNewUser({

                username,

                email,

                password:
                    hashedPassword

            });

        res.status(201).json({

            success: true,

            message:
                "Registration successful",

            user: {
                id: dbReady ? newUser._id : newUser.id,
                username:
                    newUser.username,
                email:
                    newUser.email
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Server error during registration"

        });

    }

});

/* =====================================================
   LOGIN USER
===================================================== */

app.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;
        if (!validateEmail(email)) {
    return res.status(400).json({
        success: false,
        message: "Invalid email format"
    });
}

        if (
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password required"
            });
        }

        const user =
            await findUserByEmail(
                email
            );

        if (!user) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid credentials"

            });

        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid credentials"

            });

        }

        const token = jwt.sign(

            {
                id: dbReady ? user._id : user.id,
                email: user.email
            },

            JWT_SECRET,

            {
                expiresIn: "7d"
            }

        );

        res.json({

            success: true,

            message:
                "Login successful",

            token,

            user: {

                id: dbReady ? user._id : user.id,

                username:
                    user.username,

                email:
                    user.email

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Server error during login"

        });

    }

});

/* =====================================================
   GET CURRENT USER
===================================================== */

app.get(
    "/me",
    verifyToken,
    async (req, res) => {

        try {

            const user =
                await findUserById(
                    req.user.id
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }

            const safeUser = {
                id: dbReady ? user._id : user.id,
                username: user.username,
                email: user.email,
                quizHistory: user.quizHistory || []
            };

            res.json({

                success: true,

                user: safeUser

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Server error"

            });

        }

    }
);

/* =====================================================
   DASHBOARD ANALYTICS
===================================================== */

app.get(
    "/dashboard",
    verifyToken,
    async (req, res) => {

        try {

            const user =
                await findUserById(
                    req.user.id
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }

            const history =
                user.quizHistory || [];

            const averageScore =
                calculateAverageScore(
                    history
                );

            const highestScore =
                calculateHighestScore(
                    history
                );

            const quizzesCompleted =
                calculateTotalQuizzes(
                    history
                );

            const recentQuizzes =
                history
                    .sort(
                        (a, b) =>
                            new Date(
                                b.completedAt
                            ) -
                            new Date(
                                a.completedAt
                            )
                    )
                    .slice(0, 10);

            res.json({

                success: true,

                metrics: {

                    averageScore,

                    highestScore,

                    quizzesCompleted

                },

                recentQuizzes

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Failed to load dashboard"

            });

        }

    }
);

/* =====================================================
   USER QUIZ HISTORY
===================================================== */

app.get(
    "/history",
    verifyToken,
    async (req, res) => {

        try {

            const user =
                await findUserById(
                    req.user.id
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }

            res.json({

                success: true,

                history:
                    user.quizHistory

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Failed to load history"

            });

        }

    }
);



let GoogleGenerativeAI;
let genAI = null;

try {
    ({ GoogleGenerativeAI } = require("@google/generative-ai"));

    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(
            process.env.GEMINI_API_KEY
        );
    }
} catch (loadError) {
    console.warn(
        "Gemini AI package not available or failed to load. Using placeholder quiz generation."
    );
}


/* =====================================================
   REAL GEMINI QUIZ GENERATION
===================================================== */

async function generateQuizWithGemini(
    syllabusText,
    difficulty,
    questionCount
) {

    if (!genAI || !process.env.GEMINI_API_KEY) {
        return generateQuizPlaceholder(
            syllabusText,
            difficulty,
            questionCount
        );
    }

    try {

        const model =
            genAI.getGenerativeModel({
                model: "gemini-1.5-flash"
            });

                const prompt = `Generate ${questionCount} multiple choice questions.

Difficulty Level:
${difficulty}

Source Material:
${syllabusText}

Rules:
1. Return ONLY JSON.
2. No markdown.
3. No explanation outside JSON.
4. Format exactly:

[
 {
    "question":"",
    "options":["","","",""],
    "answer":0,
    "explanation":""
 }
]

Answer must be the correct option index.
`;
 
        const result = await model.generateContent(prompt);

        const response =
            await result.response;

        const text =
            response.text();

        const cleaned =
            text
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

        return JSON.parse(cleaned);

    } catch (error) {

        console.error(
            "Gemini Error:",
            error
        );

        return generateQuizPlaceholder(
            syllabusText,
            difficulty,
            questionCount
        );
    }

}

/* =====================================================
   GENERATE QUIZ
===================================================== */

app.post(
    "/generate-quiz",
    verifyToken,
    async (req, res) => {

        try {

            const {
                syllabusText,
                difficulty,
                questionCount,
                topic
            } = req.body;

            if (
                !syllabusText ||
                !difficulty ||
                !questionCount
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Missing required fields"

                });

            }

            const quiz =
                await generateQuizWithGemini(
                    syllabusText,
                    difficulty,
                    Number(questionCount)
                );

            res.json({

                success: true,

                topic:
                    topic ||
                    "General",

                difficulty,

                totalQuestions:
                    quiz.length,

                questions:
                    quiz

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Quiz generation failed"

            });

        }

    }
);

/* =====================================================
   SAVE QUIZ RESULT
===================================================== */

app.post(
    "/save-result",
    verifyToken,
    async (req, res) => {

        try {

            const {
                score,
                total,
                percentage,
                difficulty,
                topic,
                duration
            } = req.body;

            const user =
                await findUserById(
                    req.user.id
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }

            const newResult = createQuizResult({
                score,
                total,
                percentage,
                difficulty,
                topic,
                duration
            });

            user.quizHistory.push(
                newResult
            );

            await saveUser(user);

            const savedResult =
                user.quizHistory[
                    user.quizHistory.length - 1
                ];

            res.json({

                success: true,

                message:
                    "Quiz result saved",

                result:
                    savedResult

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Failed to save result"

            });

        }

    }
);

/* =====================================================
   GET SPECIFIC RESULT
===================================================== */

app.get(
    "/result/:id",
    verifyToken,
    async (req, res) => {

        try {

            const user =
                await findUserById(
                    req.user.id
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }

            const result =
                findQuizById(
                    user,
                    req.params.id
                );

            if (!result) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Result not found"

                });

            }

            res.json({

                success: true,

                result

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch result"

            });

        }

    }
);

/* =====================================================
   DELETE RESULT
===================================================== */

app.delete(
    "/result/:id",
    verifyToken,
    async (req, res) => {

        try {

            const user =
                await findUserById(
                    req.user.id
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }

            const result =
                findQuizById(
                    user,
                    req.params.id
                );

            if (!result) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Result not found"

                });

            }

            if (dbReady && typeof result.deleteOne === "function") {
                result.deleteOne();
            } else {
                user.quizHistory = user.quizHistory.filter((quiz) => quiz.id !== result.id);
            }

            await saveUser(user);

            res.json({

                success: true,

                message:
                    "Result deleted"

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Failed to delete result"

            });

        }

    }
);

/* =====================================================
   LEADERBOARD
===================================================== */

app.get(
    "/leaderboard",
    async (req, res) => {

        try {

            const users =
                await findAllUsers();

            const leaderboard =
                users.map(user => {

                    const history =
                        user.quizHistory || [];

                    return {

                        username:
                            user.username,

                        averageScore:
                            calculateAverageScore(
                                history
                            ),

                        quizzesCompleted:
                            history.length

                    };

                })
                .sort(
                    (a, b) =>
                        b.averageScore -
                        a.averageScore
                )
                .slice(0, 20);

            res.json({

                success: true,

                leaderboard

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Failed to load leaderboard"

            });

        }

    }
);

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(
    (
        err,
        req,
        res,
        next
    ) => {

        console.error(
            "Unhandled Error:",
            err
        );

        res.status(500).json({

            success: false,

            message:
                "Internal Server Error"

        });

    }
);

/* =====================================================
   404 HANDLER
===================================================== */

// Serve static front-end files for unmatched routes (after API routes)
app.use(express.static(__dirname));

app.use(
    (
        req,
        res
    ) => {

        // If the request accepts HTML, serve index.html for SPA routing
        if (req.accepts && req.accepts('html')) {
            return res.sendFile(path.join(__dirname, 'index.html'));
        }

        res.status(404).json({

            success: false,

            message:
                "Route not found"

        });

    }
);

/* =====================================================
   SERVER STARTUP
===================================================== */

const PORT =
    process.env.PORT ||
    5000;

app.listen(
    PORT,
    () => {

        console.log(
            `====================================`
        );

        console.log(
            `EdTech Quiz Generator Running`
        );

        console.log(
            `Port: ${PORT}`
        );

        console.log(
            `Environment: ${
                process.env.NODE_ENV ||
                "development"
            }`
        );

        console.log(
            `====================================`
        );

    }
);