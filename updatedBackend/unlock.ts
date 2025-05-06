import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function unlockAllNotes() {
  try {
    // Update all notes to set lockedBy to null
    const result = await prisma.note.updateMany({
      data: {
        lockedBy: null,
      },
    });

    console.log(`Successfully unlocked ${result.count} notes.`);
  } catch (error) {
    console.error("Error unlocking notes:", error);
  } finally {
    await prisma.$disconnect();
  }
}

unlockAllNotes();
