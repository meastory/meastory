// Test story content extracted from jack-and-the-beanstalk.json for layout testing

export const SAMPLE_SCENES = {
  short: {
    id: "opening-1",
    title: "{{childName}} and the Magic Beanstalk",
    sceneTitle: "The Problem at Wiggle Lane",
    text: "In a house rather small at the end of Wiggle Lane,\nLived {{childName}} and Mother through sunshine and rain.\nTheir cupboards were empty, their pockets were light,\n\"Oh dear!\" sighed dear Mother, \"This isn't quite right!\"\n\nPoor Milky-white cow gave them milk every day,\nBut lately she'd moo in the saddest of ways.",
    choices: [
      { label: "Continue the story", nextSceneId: "opening-2" }
    ]
  },
  
  medium: {
    id: "opening-3", 
    title: "The Magic Bean Offer",
    sceneTitle: "Trader Twizzle's Mysterious Offer",
    text: "From his pocket so deep, Trader Twizzle pulled out\nSome beans that were sparkly, without any doubt.\nThey shimmered and danced in the morning sun bright,\n\"These beans,\" sang old Twizzle, \"are pure magic light!\"\n\n\"Plant them tonight when the stars start to glow,\nAnd morning will bring you the best things to know!\"",
    choices: [
      { label: "I trust in the magic!", nextSceneId: "branch-a-1" },
      { label: "Let me think about this!", nextSceneId: "branch-b-1" }
    ]
  },

  long: {
    id: "grumbleguts-arrives",
    title: "Meeting Grumbleguts",
    sceneTitle: "A Giant Encounter", 
    text: "STOMP-STOMP-STOMP! through the door came the sound,\nGrumbleguts' footsteps shaking the ground!\nBut {{childName}} felt ready with friendship so true,\n\"I know in my heart just what I should do!\"\n\n\"Oh, Grumbleguts!\" called {{childName}}, standing up tall,\n\"I'm {{childName}}, and I want to be friends with you all!\"",
    choices: [
      { label: "Explain about loneliness and friendship", nextSceneId: "friendship-ending" },
      { label: "Share your plan to help everyone", nextSceneId: "helping-ending" }
    ]
  }
};

export function personalizeContent(text: string, childName: string = "Emma"): string {
  return text.replace(/\{\{childName\}\}/g, childName);
}