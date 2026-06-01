/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

/**
 * Overall Daybreak system health state. Drives both the chrome
 * dropdown (where the user picks the simulated state) and the
 * Daybreak landing page (which renders different content per state).
 *
 *  - `healthy`  — autonomous mode is keeping things steady; no
 *                 critical alerts overnight.
 *  - `critical` — significant attacks / alerts in critical state
 *                 require action; queue surfaces in the body.
 *
 * Mirrors `NightshiftStatus` in observability — Daybreak is the
 * Security solution's parallel to Nightshift, with its own set of
 * states tailored to Security workflows.
 */
export type DaybreakStatus = 'healthy' | 'critical';

/**
 * Module-singleton BehaviorSubject keeping the current Daybreak state.
 * Components subscribe via either `useObservable` or a direct
 * subscription (depending on which React root they live in — the
 * chrome dropdown lives in a separate root than the page body, and
 * direct subscription avoids singleton/bundling ambiguity across
 * roots).
 *
 * The default is `healthy` — the user lands on the Daybreak surface
 * with the steady-state copy on first arrival.
 */
export const daybreakStatus$ = new BehaviorSubject<DaybreakStatus>('healthy');

/** Update the global Daybreak state from anywhere in the security plugin. */
export function setDaybreakStatus(status: DaybreakStatus): void {
  daybreakStatus$.next(status);
}
