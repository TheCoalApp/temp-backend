"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePodcastPath = generatePodcastPath;
const prisma_1 = require("./prisma");
const gemini_1 = require("./gemini");
const text_to_speech_1 = __importDefault(require("@google-cloud/text-to-speech"));
const ttsClient = new text_to_speech_1.default.TextToSpeechLongAudioSynthesizeClient();
function generatePodcastPath(nodeId) {
    return __awaiter(this, void 0, void 0, function* () {
        const bucketName = "note-podcasts";
        const gcsUri = `gs://${bucketName}/note-${nodeId}.mp3`;
        const objectPath = `note-${nodeId}.mp3`;
        const note = yield prisma_1.prisma.note.findUnique({
            where: {
                noteid: nodeId
            }
        });
        if (!note) {
            throw new Error("Note not found");
        }
        const podcastScript = yield (0, gemini_1.generatePodcastScript)(note.noteDescription);
        const cleanedSSML = cleanSSML(podcastScript.response.text());
        const [operation] = yield ttsClient.synthesizeLongAudio({
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
        console.log(objectPath);
        console.log("Operation started. Waiting for it to complete...");
        yield operation.promise(); // <-- THIS is very important!!
        console.log("Podcast audio generation completed!");
        return objectPath;
    });
}
function cleanSSML(ssml) {
    return ssml
        .trim()
        .replace(/^```xml\s*/i, '') // Remove opening ```xml
        .replace(/```$/, '') // Remove closing ```
        .trim();
}
