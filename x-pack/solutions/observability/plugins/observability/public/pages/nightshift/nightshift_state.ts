/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

/**
 * Overall Nightshift system health state. Drives both the chrome
 * dropdown (where the user picks the simulated state) and the
 * Nightshift analyzing page (which renders different copy + icons per
 * state).
 *
 *  - `loading`  — workflows are still discovering / analysing data.
 *  - `healthy`  — workflows have settled, no significant events.
 *  - `morning`  — overnight remediation summary (prototype: mirrors healthy UI).
 *  - `critical` — significant events in critical state require action.
 *  - `vectordb` — VectorDB flavoured Nightshift surface for the Search
 *                solution; default option in `'es'`-solution spaces.
 *  - `search`   — "Search Labs" flavoured Nightshift surface; second
 *                option in `'es'`-solution spaces.
 */
export type NightshiftStatus =
  | 'loading'
  | 'healthy'
  | 'morning'
  | 'critical'
  | 'vectordb'
  | 'search';

/**
 * Module-singleton BehaviorSubject keeping the current Nightshift state.
 * Components subscribe via `useObservable(nightshiftStatus$, …)`.
 *
 * The default is `loading` — matches the "Welcome to Nightshift, we are
 * still analysing your data" experience the user lands on after
 * enabling Nightshift mode.
 */
export const nightshiftStatus$ = new BehaviorSubject<NightshiftStatus>('loading');

/** Update the global Nightshift state from anywhere in the obs plugin. */
export function setNightshiftStatus(status: NightshiftStatus): void {
  nightshiftStatus$.next(status);
}
