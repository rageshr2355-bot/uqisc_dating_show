// Server-side text hygiene for anything an audience member can type that
// ends up on other people's phones or the stage screen.
//
//   clampText         – hard length caps (the phone UI has maxLength on its
//                       inputs, but a curl request can skip that).
//   containsProfanity – blocklist check. Whole words, case-insensitive, with
//                       common letter→symbol swaps (a→@, i→1, s→$ …) and
//                       stretched letters ("fuuuck") caught too.
//
// This is a practical list for a live college event, not a clever filter —
// the host's confession moderation queue remains the real backstop. Add to
// BLOCKLIST as needed.

const BLOCKLIST = [
  // English
  'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit', 'shitty',
  'bitch', 'bitches', 'asshole', 'arsehole', 'ass', 'bastard', 'cunt', 'dick',
  'dickhead', 'piss', 'pissed', 'slut', 'whore', 'hoe', 'cock', 'pussy', 'twat',
  'wanker', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'rape',
  'rapist', 'paki', 'chink',
  // Hindi / Urdu (romanised) — common transliterations
  'chutiya', 'chutiye', 'chutia', 'bhenchod', 'behenchod', 'bhenchood', 'bc',
  'madarchod', 'maderchod', 'mc', 'gandu', 'gaand', 'gand', 'lund', 'lauda',
  'loda', 'randi', 'harami', 'kutta', 'kutti', 'kamina', 'kamini', 'saala',
  'saali', 'bhosdike', 'bhosdi', 'chodu', 'jhaat', 'jhant', 'tatti',
];

// Leet-speak tolerant character classes
const LEET: Record<string, string> = {
  a: '[a@4]', b: '[b8]', e: '[e3]', i: '[i1!|]', l: '[l1|]', o: '[o0]',
  s: '[s$5]', t: '[t7+]', g: '[g9]', u: '[u0]', z: '[z2]',
};

function wordToPattern(word: string): string {
  return word
    .split('')
    .map((ch) => `${LEET[ch] ?? ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}+`)
    .join('');
}

const BLOCK_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${BLOCKLIST.map(wordToPattern).join('|')})(?![\\p{L}\\p{N}])`,
  'iu',
);

export function containsProfanity(text: unknown): boolean {
  return typeof text === 'string' && text.length > 0 && BLOCK_RE.test(text);
}

export function clampText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // Collapse runs of whitespace so a wall of newlines can't blow up the stage layout
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export const LIMITS = {
  hotTake: 240,
  writeIn: 60,
  optionLabel: 60,
  optionDescription: 120,
  confession: 300,
} as const;
