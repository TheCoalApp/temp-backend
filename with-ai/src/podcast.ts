import { prisma } from "./prisma";
import { generatePodcastScript } from "./gemini";
import textToSpeech from '@google-cloud/text-to-speech';


const ttsClient = new textToSpeech.TextToSpeechLongAudioSynthesizeClient();

export async function generatePodcastPath(nodeId: any) {

    const bucketName = "note-podcasts";
    const gcsUri = `gs://${bucketName}/note-${nodeId}.mp3`
    const objectPath = `note-${nodeId}.mp3`;

    const note = await prisma.note.findUnique({
        where: {
            noteid: nodeId
        }
    });

    if (!note) {
        throw new Error("Note not found");
    }

    const podcastScript = await generatePodcastScript(note.noteDescription);

    const cleanedSSML = cleanSSML(podcastScript.response.text());

    const [operation] = await ttsClient.synthesizeLongAudio({
        input: { 
            ssml: cleanedSSML
        },
        voice: { 
            name: "en-US-Wavenet-D",
            languageCode: "en-US", 
            ssmlGender: "NEUTRAL" 
        },
        audioConfig: { 
            audioEncoding: "LINEAR16" 
        },
        parent: `projects/497091280925/locations/global`,
        outputGcsUri: gcsUri,
    });

    console.log(objectPath)

    console.log("Operation started. Waiting for it to complete...");

    await operation.promise();  // <-- THIS is very important!!

    console.log("Podcast audio generation completed!");

    return objectPath;
}


function cleanSSML(ssml: string): string {
    return ssml
      .trim()
      .replace(/^```xml\s*/i, '')   // Remove opening ```xml
      .replace(/```$/, '')          // Remove closing ```
      .trim();
}