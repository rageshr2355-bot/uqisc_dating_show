import { CreatePollPayload, PollCategory } from './types';

export interface QuestionTemplate {
  id: string;
  category: PollCategory;
  categoryLabel: string;
  badge: string;
  title: string;
  prompt: string;
  options: { label: string; description?: string; tag?: string; requiresWriteIn?: boolean }[];
  requiresVoterInput: boolean;
  inputPromptText: string;
  allowAudienceOptions: boolean;
}

export const JAB_WE_MATCHED_PRESETS: QuestionTemplate[] = [
  {
    id: 'preset-bill-split',
    category: 'drama',
    categoryLabel: '🚩 RED FLAG OR ROMANCE?',
    badge: 'Campus Debate 💸',
    title: 'First Date Etiquette: Who pays for the dinner & cutting chai?',
    prompt: 'The couple just finished their first speed-dating meal. The check arrives at the table. What is the strictly correct etiquette?',
    options: [
      {
        label: 'Whoever asked the other person out pays in full',
        description: 'Golden traditional rule of chivalry and intention.',
        tag: 'Classic Romance 🌹',
      },
      {
        label: 'Strict 50/50 Split on UPI / Google Pay',
        description: 'Modern equality, no awkward debt or expectations.',
        tag: 'Modern & Fair 🤝',
      },
      {
        label: 'One pays dinner, the other covers dessert / chai',
        description: 'The smoothest way to guarantee there is a second stop!',
        tag: 'Smooth Operator ☕',
      },
      {
        label: 'Audience Choice: Nominate a hilarious campus alternative!',
        description: 'Whoever loses rock-paper-scissors pays the bill.',
        tag: 'Audience Twist 🎲',
        requiresWriteIn: true,
      },
    ],
    requiresVoterInput: true,
    inputPromptText: 'Why do you believe this? Share your first date rule of thumb:',
    allowAudienceOptions: true,
  },
  {
    id: 'preset-ex-photos',
    category: 'drama',
    categoryLabel: '🚩 RED FLAG OR INNOCENT?',
    badge: 'Phone Drama 📱',
    title: "He still has photos with his ex on his Instagram grid from 2022. Dealbreaker?",
    prompt: "A contestant discovered their match's old vacation photos with an ex are still up. 700 spectators, is this a red flag or healthy maturity?",
    options: [
      {
        label: 'Major Red Flag 🚩 Archive or Delete immediately!',
        description: 'Clear the past before you step into a new romantic chapter.',
        tag: 'Red Flag Alert 🚩',
      },
      {
        label: 'Green Flag 🟢 It is just his history; no drama needed',
        description: 'He does not pretend the past did not happen. Emotionally secure.',
        tag: 'Secure & Mature 🌿',
      },
      {
        label: 'Yellow Flag ⚠️ Acceptable only if captioned neutrally',
        description: 'If the romantic captions are still intact, call the police.',
        tag: 'Proceed With Caution ⚠️',
      },
    ],
    requiresVoterInput: true,
    inputPromptText: 'Spectator Verdict: Would you ask your match to delete them?',
    allowAudienceOptions: false,
  },
  {
    id: 'preset-phone-passcode',
    category: 'truth_or_dare',
    categoryLabel: '💘 SOULMATE TRUST CHECK',
    badge: 'Trust & Secrets 🔓',
    title: 'Would you give your date your phone passcode right now on stage?',
    prompt: 'True vulnerability test! The hosts ask both contestants to swap unlocked phones for 60 seconds.',
    options: [
      {
        label: 'Take it! Open book with zero secrets 📖',
        description: 'Nothing to hide, 100% transparent and trust-forward.',
        tag: '100% Trust 💖',
      },
      {
        label: 'Never! Privacy does not equal secrecy 🛑',
        description: 'Healthy boundaries are essential even in soulmate connections.',
        tag: 'Healthy Boundaries 🛡️',
      },
      {
        label: 'Only if I can delete my group chats first 😂',
        description: 'The homies banter cannot be exposed under any circumstances.',
        tag: 'Protect the Boys/Girls 💀',
      },
    ],
    requiresVoterInput: true,
    inputPromptText: 'Audience Verdict: What is the most dangerous app on your phone right now?',
    allowAudienceOptions: true,
  },
  {
    id: 'preset-train-chase',
    category: 'hideaway',
    categoryLabel: '💌 BOLLYWOOD ROMANCE TEST',
    badge: 'Filmy Vibes 🚂',
    title: "Jab We Met Moment: Would you run through an airport/train station for love?",
    prompt: 'Your match got an internship offer in another city and is boarding tonight. Do you make the dramatic Bollywood movie sprint?',
    options: [
      {
        label: 'Sprint like Aditya Kashyap! Life is too short for regrets 🏃‍♂️💨',
        description: 'Buy the platform ticket and pull the emergency chain!',
        tag: 'Peak Bollywood 🎬',
      },
      {
        label: 'Send a heartfelt WhatsApp message instead 📱',
        description: 'Practical romance: emotional, but not getting arrested by railway security.',
        tag: 'Sensible Lover ☕',
      },
      {
        label: 'Wish them luck and move on 👋 Long distance is a trap',
        description: 'Campus reality check: if it was meant to be, it will happen later.',
        tag: 'Brutal Realist 🧊',
      },
    ],
    requiresVoterInput: true,
    inputPromptText: 'Share the most dramatic thing you have ever done for romance:',
    allowAudienceOptions: true,
  },
  {
    id: 'preset-best-match',
    category: 'recoupling',
    categoryLabel: '⚡ WILDCARD CEREMONY',
    badge: 'Cupid Decision 🏹',
    title: 'Which Contestant Has The Most Irresistible Stage Charm Tonight?',
    prompt: 'The 700 spectators vote on who stole the show with their wits, style, and charisma.',
    options: [
      {
        label: 'The Witty Banter Specialist 🎙️',
        description: 'Never missed a punchline, kept the whole hall laughing.',
        tag: 'Golden Humor 🌟',
      },
      {
        label: 'The Mysterious Quiet Romantic 🥀',
        description: 'Subtle smiles, intense eye contact, poet vibes.',
        tag: 'Deep Chemistry ✨',
      },
      {
        label: 'The Golden Retriever Energy Dynamo 🐕',
        description: 'Unapologetically hyped, cheering for everyone, contagious smile.',
        tag: 'Pure Sunshine ☀️',
      },
      {
        label: 'Audience Write-In: Pick someone from the crowd! 👀',
        description: 'Someone sitting in the audience deserves the stage mic.',
        tag: 'Audience Star 🌟',
        requiresWriteIn: true,
      },
    ],
    requiresVoterInput: true,
    inputPromptText: 'Nominate their best moment from tonight:',
    allowAudienceOptions: true,
  },
  {
    id: 'preset-ghosting',
    category: 'dumping',
    categoryLabel: '💔 FRIENDZONE OR DUMPING',
    badge: 'Dating Reality 👻',
    title: 'Is Ghosting After 2-3 Great Dates Ever Justified?',
    prompt: 'A contestant confessed they went completely silent after 3 dinner dates because they got overwhelmed. Audience jury: what is your verdict?',
    options: [
      {
        label: 'Totally Inexcusable ❌ Send a 2-sentence polite closure text!',
        description: 'Basic decency costs zero rupees. Respect their time.',
        tag: 'Zero Excuses 🚫',
      },
      {
        label: 'Understandable Sometimes 🤷 Situations get awkward',
        description: 'If you felt pressured or uncomfortable, silence is an answer.',
        tag: 'Nuanced Take ⚖️',
      },
      {
        label: 'Stage Penalty: Make them text their ghost right now on stage! 📱🔥',
        description: 'Unfinished business tribunal live on the big screen.',
        tag: 'Live Redemption 🍿',
      },
    ],
    requiresVoterInput: true,
    inputPromptText: 'Have you ever ghosted or been ghosted? Share your take:',
    allowAudienceOptions: false,
  },
];
