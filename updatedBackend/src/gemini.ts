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
    Note to turn into a podcast script:
    ${noteDescription}
    Analyze the note above and generate a TTS-optimized narration script that maintains 100% of the content while making it listenable. Follow these rules:

    1. First identify the note type (meeting/lecture/journal/etc.) through patterns like:
    - Key phrases: "Attendees", "Action Items", "Lecture Topic"
    - Content structure: Agenda points vs. academic concepts
    - Temporal markers: "Tomorrow we'll..." vs. "In 1969,..."

    2. Structure the audio script as:
    [Context Setup] "Note from [Wednesday Meeting] about [Q4 Planning], recorded [2024-03-15]"
    [Body] Group related concepts using:
    - Spoken section headers ("Next, the main decisions")
    - Logical connectors ("This leads us to...")
    - Vocal emphasis on key terms and metrics

    3. For different content types:
    - Meetings: Highlight decisions > list attendees > clarify action owners
    - Lectures: Explain concepts > use examples > add "Remember that..." mnemonics
    - Technical notes: Spell acronyms first > explain complex terms

    4. Use conversational TTS optimizations:
    - Convert tables to "X versus Y is..." comparisons
    - Make lists parallel structure ("Task 1:..., Task 2:...")
    - Replace symbols: ">80%" → "over 80 percent"
    - Use "and" instead of "&" for clarity
    - Avoid abbreviations: "etc." → "and so on"
    - Use "percent" instead of "%" for clarity
    - Don't use any special characters or symbols as they can cause issues with TTS engines
    - Make it sound natural conversationally, as if a human is speaking

    5. Maintain original data fidelity by:
    - Keeping all numbers/dates/names
    - Using exact quotes when provided

    Output format:
    [Identified Note Type]
    [Estimated XX minutes]
    [The script itself]
`);

    return podcastScript;
}