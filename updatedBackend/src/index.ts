import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { v1_router } from "./routes/mainRouter";

// Load .env file
dotenv.config();

const app = express();
const port = 3000;

app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
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
app.use(helmet());

// Rate limiting
app.use("/api/v1", rateLimit({
    windowMs: 60 * 1000,
    max: 30000 // 300 requests per IP
}));

app.use(express.json());
app.use("/api/v1", v1_router);

// Log all registered routes
console.log("App routes:");
app._router.stack.forEach((r: any) => {
    if (r.route && r.route.path) {
        console.log(r.route.path);
    }
});

// Error handling - Ensure JSON response
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: "Something went wrong!", message: err.message });
});

app.listen(port, '127.0.0.1', () => {
    console.log(`Example app listening on port ${port}`);
});
