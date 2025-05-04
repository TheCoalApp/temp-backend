import { GoogleGenerativeAI } from "@google/generative-ai"
import { env } from "process";

if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });



export async function generateEmbedding(text: string) {
    const response = await embeddingModel.embedContent(text);
    return response;
}

export async function generateSummary(noteDescription: string) {
    const response = await textModel.generateContent(`
        You are an expert summarization assistant. Your task is to create a concise, accurate summary of the given note, based on it's description.

        INSTRUCTIONS:
        - Do not say that this is a summary.
        - Identify and extract the key points, main ideas, action items, and essential information.
        - Preserve critical details, dates, names, and specific commitments.
        - Maintain the original meaning and intent without adding new information.
        - Format the summary in clear, concise bullet points for readability.
        - Prioritize information in order of importance.
        - Include any deadlines or time-sensitive information with appropriate emphasis.
        - If the note contains technical terms or specialized vocabulary, maintain them in the summary.
        - Aim for approximately [X]% of the original length (typically 10-20% depending on note size).

        NOTE CONTENT:
        ${noteDescription}

        SUMMARY:
    `);

    return response;
}

export async function generateRAGResponse(prompt: string, context: string) {
    const response = await textModel.generateContent(`
        You are an AI assistant answering questions based on the user's personal notes. 
        Your task is to provide accurate, helpful responses using ONLY the information from the provided context.

        CONTEXT:
        ${context}

        INSTRUCTIONS:
        - Answer ONLY based on the information in the context above
        - If the context doesn't contain enough information to answer fully, acknowledge this limitation
        - If the context contains multiple or conflicting pieces of information, mention this in your response
        - Keep your response concise and directly relevant to the question
        - Do not make up or infer information that isn't explicitly stated in the context
        - Format your response in a natural, conversational way

        USER QUESTION: ${prompt}

        YOUR RESPONSE:
    `);
    return response;
}


export async function generatePodcastScript(noteDescription: string) {
    const podcastScript = await textModel.generateContent(`
        You are a professional podcast scriptwriter specializing in single-person podcasts. Your goal is to transform the following description into a captivating podcast script with Google's Speech Synthesis Markup Language (SSML). Use SSML as much as possible to enhance the audio experience. 

        Description:
        ${noteDescription}

        Instructions:

        - Understand the Core Idea: Identify the central theme, key arguments, and desired tone from the description.
        - Develop a Catchy Title: Create an engaging and relevant title for the podcast episode.
        - Write a Compelling Introduction (something that would take approximately 30-60 seconds):
            - Hook the listener immediately.
            - Clearly state the episode's topic and what the listener can expect to gain.
            - Establish the host's voice and persona.
        -  Structure the Main Content (adapt length as needed):
            - Organize the information logically with clear transitions between points.
            - Incorporate engaging storytelling, anecdotes, or examples to illustrate ideas.
            - Maintain a natural and conversational flow.
        -  Craft a Thought-Provoking Conclusion (something that would take approximately 30-45 seconds):
            - Summarize the key takeaways.
            - Offer a final thought, call to action (if appropriate), or a question for the listener.
            - Provide a smooth outro.
    `);

    return podcastScript;
}