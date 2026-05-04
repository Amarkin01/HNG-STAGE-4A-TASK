import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envFile.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';

const genAI = new GoogleGenerativeAI(apiKey);
process.env.GEMINI_API_KEY = apiKey;

async function list() {
  console.log("Fetching models...");
  try {
    // Note: The Node SDK doesn't have a direct listModels sometimes, but we can do a fetch directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("Available Models for generateContent:");
    data.models.forEach(model => {
        if (model.supportedGenerationMethods.includes("generateContent")) {
            console.log(`- ${model.name.replace('models/', '')}`);
        }
    });
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

list();
