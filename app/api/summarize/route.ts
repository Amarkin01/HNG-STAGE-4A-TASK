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
        const prompt = `
        You are an AI page summarizer. Summarize the following text.
        
        Return ONLY a JSON object with this exact structure:
        {
          "summary": ["bullet 1", "bullet 2", "bullet 3"],
          "keyInsights": ["insight 1", "insight 2"],
          "estimatedReadingTime": "X min read"
        }
        
        Text to summarize:
        ${text}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean up markdown code blocks if the AI includes them
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseText;
        const data = JSON.parse(jsonString);

        return NextResponse.json(
            data,
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