// Standalone development entry point. Vercel deploys the Express app from app.js.
import app from "./app.js";

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
});
