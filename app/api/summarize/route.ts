import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// This function handles the "Preflight" request from the extension
export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        // Debugging: Check if API key is loaded
        if (!process.env.GEMINI_API_KEY) {
            console.error("Missing API Key in environment variables!");
            throw new Error("Missing API Key");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Summarize this text in 3 bullet points: ${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;


        return NextResponse.json(
            { summary: response.text() },
            { headers: { "Access-Control-Allow-Origin": "*" } }
        );
    } catch (error: any) {
        // This will print the REAL error in your VS Code terminal
        console.error("DETAILED API ERROR:", error.message);

        // Forward the upstream HTTP status (e.g. 429 rate-limit) so the
        // client-side catch block can detect it via err.message or response.status
        const statusMatch = error.message?.match(/(\d{3})/);
        const status = statusMatch ? parseInt(statusMatch[1]) : 500;
        const httpStatus = [400, 401, 403, 404, 429, 500, 503].includes(status)
            ? status
            : 500;

        return NextResponse.json(
            { error: error.message || "API Error" },
            {
                status: httpStatus,
                headers: { "Access-Control-Allow-Origin": "*" }
            }
        );
    }
}