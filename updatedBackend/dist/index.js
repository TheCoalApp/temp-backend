"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const mainRouter_1 = require("./routes/mainRouter");
// Load .env file
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3000;
app.set('trust proxy', 1);
// CORS configuration
app.use((0, cors_1.default)({
    origin: ["https://thecoalapp.com", "http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-session-id"], // Add x-session-id
    credentials: true
}));
// Explicitly handle OPTIONS requests for debugging
app.options('*', (req, res) => {
    console.log(`OPTIONS Request - Origin: ${req.headers.origin}, Method: ${req.method}`);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-session-id'); // Add x-session-id
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(204);
});
// Debug all requests
app.use((req, res, next) => {
    console.log(`Request - Origin: ${req.headers.origin}, Method: ${req.method}, URL: ${req.url}`);
    next();
});
// Security headers
app.use((0, helmet_1.default)());
// Rate limiting
app.use("/api/v1", (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30000 // 300 requests per IP
}));
app.use(express_1.default.json());
app.use("/api/v1", mainRouter_1.v1_router);
// Log all registered routes
console.log("App routes:");
app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
        console.log(r.route.path);
    }
});
// Error handling - Ensure JSON response
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: "Something went wrong!", message: err.message });
});
app.listen(port, '127.0.0.1', () => {
    console.log(`Example app listening on port ${port}`);
});
