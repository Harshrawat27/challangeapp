export type ChallengeId = '75-hard' | '75-medium' | '75-soft' | 'monk-mode' | 'custom';

export type ChallengeTask = {
  id: string;
  icon: string;       // Material Symbols ligature
  label: string;
  meta: string;
};

export type Challenge = {
  id: ChallengeId;
  name: string;
  defaultDuration: number;
  difficulty: number;   // 1-5
  summary: string;
  description: string;
  tasks: ChallengeTask[];
};

export const CHALLENGES: Challenge[] = [
  {
    id: '75-hard',
    name: '75 Hard',
    defaultDuration: 75,
    difficulty: 5,
    summary: 'The original. No compromises.',
    description: "Andy Frisella's mental toughness program. The hardest of them all.",
    tasks: [
      { id: 'w1',    icon: 'fitness_center', label: 'Workout 1',       meta: 'Indoor · 45 min' },
      { id: 'w2',    icon: 'directions_run', label: 'Workout 2',       meta: 'Outdoor · 45 min' },
      { id: 'water', icon: 'water_drop',     label: 'Hydrate',         meta: '1 gallon' },
      { id: 'read',  icon: 'menu_book',      label: 'Read',            meta: '10 pages, non-fiction' },
      { id: 'diet',  icon: 'restaurant',     label: 'Diet',            meta: 'No cheats, no alcohol' },
      { id: 'photo', icon: 'photo_camera',   label: 'Progress photo',  meta: 'Daily' },
    ],
  },
  {
    id: '75-medium',
    name: '75 Medium',
    defaultDuration: 75,
    difficulty: 4,
    summary: 'The discipline, without the burden.',
    description: 'Same length, gentler load. One workout, not two.',
    tasks: [
      { id: 'w',     icon: 'fitness_center', label: 'Workout',         meta: '45 min' },
      { id: 'water', icon: 'water_drop',     label: 'Hydrate',         meta: '1 gallon' },
      { id: 'read',  icon: 'menu_book',      label: 'Read',            meta: '10 pages' },
      { id: 'diet',  icon: 'restaurant',     label: 'Diet of choice',  meta: 'Stick to it' },
      { id: 'photo', icon: 'photo_camera',   label: 'Progress photo',  meta: 'Daily' },
    ],
  },
  {
    id: '75-soft',
    name: '75 Soft',
    defaultDuration: 75,
    difficulty: 3,
    summary: 'Build the habit. Lower bar.',
    description: 'For people new to challenges. Lowest barrier, same length.',
    tasks: [
      { id: 'move',    icon: 'directions_walk', label: 'Move your body',    meta: '30 min, anything counts' },
      { id: 'water',   icon: 'water_drop',      label: 'Hydrate',           meta: '3 liters' },
      { id: 'eat',     icon: 'restaurant',      label: 'Mindful eating',    meta: 'No strict diet' },
      { id: 'learn',   icon: 'menu_book',       label: 'Read or listen',    meta: '10 pages or audiobook' },
      { id: 'reflect', icon: 'edit_note',       label: 'Daily reflection',  meta: 'A short journal note' },
    ],
  },
  {
    id: 'monk-mode',
    name: 'Monk Mode',
    defaultDuration: 30,
    difficulty: 5,
    summary: 'Deep work. No distractions.',
    description: 'For makers, founders, students. 30 days of focus.',
    tasks: [
      { id: 'dw',        icon: 'lightbulb',       label: 'Deep work',        meta: '2 blocks daily' },
      { id: 'no-social', icon: 'phone_disabled',  label: 'No social media',  meta: 'All day' },
      { id: 'journal',   icon: 'edit_note',       label: 'Journal',          meta: 'Daily entry' },
      { id: 'sober',     icon: 'no_drinks',       label: 'No alcohol',       meta: 'Full sobriety' },
      { id: 'sleep',     icon: 'bedtime',         label: 'Sleep 7+ hrs',     meta: 'Consistent schedule' },
    ],
  },
  {
    id: 'custom',
    name: 'Build your own',
    defaultDuration: 30,
    difficulty: 0,
    summary: 'Total flexibility. Your rules.',
    description: 'Pick your duration. Pick your habits. Make it yours.',
    tasks: [],
  },
];

export function getChallenge(id: ChallengeId | null): Challenge | null {
  if (!id) return null;
  return CHALLENGES.find(c => c.id === id) ?? null;
}
