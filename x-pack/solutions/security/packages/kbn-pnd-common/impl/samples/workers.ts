/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default values for the global worker catalog, seeded into the server store.
 *
 * `lastRunSecondsAgo` is a seed-only field: the store converts it to an absolute ISO timestamp when
 * it seeds, so relative labels ("4m ago") stay believable for the life of the Kibana process
 * instead of drifting to "16 days ago" the way a hardcoded date would.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '../../constants';
import type { WatchWorker } from '../schemas/components/watch_settings.gen';

/** Worker catalog entry before the store stamps `lastRun`. */
export type WatchWorkerSeed = Omit<WatchWorker, 'lastRun'> & {
  /** Null when the worker has no last run to show, e.g. paused. */
  lastRunSecondsAgo: number | null;
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;

export const WORKERS_SEED: WatchWorkerSeed[] = [
  {
    id: 'threat-intel-enrichment',
    watchIds: [
      SYSTEM_SECURITY_WATCH_FLOOR_ID,
      SYSTEM_SECURITY_WATCH_OFFICER_ID,
      SYSTEM_SECURITY_WATCH_DARK_ID,
      SYSTEM_SECURITY_WATCH_DEEP_ID,
    ],
    lastRunSecondsAgo: 4 * MINUTE,
    enabled: true,
    state: 'ok',
  },
  {
    id: 'alert-correlation',
    watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID, SYSTEM_SECURITY_WATCH_OFFICER_ID],
    lastRunSecondsAgo: 12 * MINUTE,
    enabled: true,
    // Degraded because the VirusTotal lookup skill it depends on is unavailable — this is what
    // drives the warning-coloured timestamp and the reduced-coverage status line in the design.
    state: 'degraded',
    stateReason: 'VirusTotal lookup still unavailable, running at reduced coverage',
    lifecycle: 'pilot',
  },
  {
    id: 'host-context',
    watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID, SYSTEM_SECURITY_WATCH_DEEP_ID],
    lastRunSecondsAgo: null,
    enabled: false,
    state: 'paused',
  },
  {
    id: 'attack-discovery-continuation',
    watchIds: [
      SYSTEM_SECURITY_WATCH_FLOOR_ID,
      SYSTEM_SECURITY_WATCH_DARK_ID,
      SYSTEM_SECURITY_WATCH_DEEP_ID,
    ],
    lastRunSecondsAgo: 31 * MINUTE,
    enabled: true,
    state: 'ok',
  },
  {
    id: 'containment',
    watchIds: [SYSTEM_SECURITY_WATCH_DARK_ID],
    lastRunSecondsAgo: 2 * HOUR,
    enabled: true,
    state: 'ok',
  },
  {
    id: 'case-assembly',
    watchIds: [SYSTEM_SECURITY_WATCH_OFFICER_ID],
    lastRunSecondsAgo: 12 * MINUTE,
    enabled: true,
    state: 'ok',
  },
  {
    id: 'rule-tuning',
    watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
    lastRunSecondsAgo: 22 * MINUTE,
    enabled: true,
    state: 'ok',
  },
  {
    id: 'rule-creation',
    watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
    lastRunSecondsAgo: 1 * HOUR,
    enabled: true,
    state: 'ok',
  },
  {
    id: 'prebuilt-rule-onboarding',
    watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
    lastRunSecondsAgo: null,
    enabled: false,
    state: 'paused',
  },
];
