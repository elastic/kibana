/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default values for the global skill catalog, seeded into the server store.
 *
 * Skill ids are unique among skills only: Containment and Case assembly each exist as both a worker
 * and a skill.
 *
 * `lastRunSecondsAgo` is a seed-only field — see the note in `workers.ts`.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '../../constants';
import type { WatchSkill } from '../schemas/components/watch_settings.gen';

/** Skill catalog entry before the store stamps `lastRun`. */
export type WatchSkillSeed = Omit<WatchSkill, 'lastRun'> & {
  /** Null when the skill has never been invoked. */
  lastRunSecondsAgo: number | null;
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;

export const SKILLS_SEED: WatchSkillSeed[] = [
  {
    id: 'alert-triage',
    watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID, SYSTEM_SECURITY_WATCH_DARK_ID],
    lastRunSecondsAgo: 4,
  },
  {
    id: 'mitre-attack-mapping',
    watchIds: [
      SYSTEM_SECURITY_WATCH_FLOOR_ID,
      SYSTEM_SECURITY_WATCH_DEEP_ID,
      SYSTEM_SECURITY_WATCH_DETECTION_ID,
    ],
    lastRunSecondsAgo: 18 * MINUTE,
  },
  {
    id: 'dark-web-feeds',
    watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
    lastRunSecondsAgo: 1 * HOUR,
  },
  {
    id: 'virustotal-lookup',
    watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
    lastRunSecondsAgo: null,
  },
  {
    id: 'case-assembly',
    watchIds: [SYSTEM_SECURITY_WATCH_OFFICER_ID],
    lastRunSecondsAgo: 12 * MINUTE,
  },
  {
    id: 'escalation',
    watchIds: [SYSTEM_SECURITY_WATCH_OFFICER_ID],
    lastRunSecondsAgo: 3 * HOUR,
  },
  {
    id: 'containment',
    watchIds: [SYSTEM_SECURITY_WATCH_DARK_ID],
    lastRunSecondsAgo: 31 * MINUTE,
  },
  {
    id: 'rule-preview',
    watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
    lastRunSecondsAgo: 26 * MINUTE,
  },
];
