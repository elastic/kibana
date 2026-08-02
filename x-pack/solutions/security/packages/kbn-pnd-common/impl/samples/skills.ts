/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default values for the global skill catalog, seeded into the server store.
 *
 * ⚠️ This is a **stub**, and deliberately kept as one (kibana-phf4.6). Skills belong to Agent
 * Builder: an agent's skills are the `skill_ids` of its agent definition, and PND neither owns the
 * catalog nor writes to it. The rows below therefore describe skills PND's agents name, with a
 * global enablement flag that nothing consults at execution time. Workers went the other way in
 * kibana-phf4.6 — they are now projected from the lanes that really run, and their `skillIds` come
 * straight off the agent definition rather than from this seed. Skills stay seeded because the real
 * replacement is an Agent Builder read, not a PND table; see the register entry in the plugin README.
 *
 * `lastRunSecondsAgo` is a seed-only field: the store converts it to an absolute ISO timestamp when
 * it seeds, so relative labels ("4m ago") stay believable for the life of the Kibana process instead
 * of drifting to "16 days ago" the way a hardcoded date would.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
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
    enabled: true,
  },
  {
    id: 'mitre-attack-mapping',
    watchIds: [
      SYSTEM_SECURITY_WATCH_FLOOR_ID,
      SYSTEM_SECURITY_WATCH_DEEP_ID,
      SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
    ],
    lastRunSecondsAgo: 18 * MINUTE,
    enabled: true,
  },
  {
    id: 'dark-web-feeds',
    watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
    lastRunSecondsAgo: 1 * HOUR,
    enabled: true,
  },
  {
    id: 'virustotal-lookup',
    watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
    lastRunSecondsAgo: null,
    // Globally off. Watch Floor still attaches it with the per-watch flag on, which is what
    // demonstrates effective = global AND per-watch.
    enabled: false,
  },
  {
    id: 'case-assembly',
    watchIds: [SYSTEM_SECURITY_WATCH_OFFICER_ID],
    lastRunSecondsAgo: 12 * MINUTE,
    enabled: true,
  },
  {
    id: 'escalation',
    watchIds: [SYSTEM_SECURITY_WATCH_OFFICER_ID],
    lastRunSecondsAgo: 3 * HOUR,
    enabled: true,
  },
  {
    id: 'containment',
    watchIds: [SYSTEM_SECURITY_WATCH_DARK_ID],
    lastRunSecondsAgo: 31 * MINUTE,
    enabled: true,
  },
  {
    id: 'rule-preview',
    watchIds: [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID],
    lastRunSecondsAgo: 26 * MINUTE,
    enabled: true,
  },
];
