/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, distinctUntilChanged, filter, map, pairwise, type Observable } from 'rxjs';

/**
 * How long a flag value must hold before it counts. The flag is re-evaluated on
 * every evaluation-context change, and early evaluations can run against an
 * incomplete context (e.g. before deployment metadata lands).
 */
export const NIGHTSHIFT_FLAG_SETTLE_MS = 15_000;

/**
 * Emits once per runtime on→off flip of the Nightshift feature flag, counting a
 * value only once it has held for `NIGHTSHIFT_FLAG_SETTLE_MS`. The flag reads
 * `false` at boot until the feature-flag provider connects, so neither the
 * initial value nor a transient reading while the context settles ever counts
 * as turning it off.
 */
export const whenNightshiftTurnsOff = (enabled$: Observable<boolean>): Observable<void> =>
  enabled$.pipe(
    distinctUntilChanged(),
    debounceTime(NIGHTSHIFT_FLAG_SETTLE_MS),
    distinctUntilChanged(),
    pairwise(),
    filter(([wasEnabled, isEnabled]) => wasEnabled && !isEnabled),
    map(() => undefined)
  );
