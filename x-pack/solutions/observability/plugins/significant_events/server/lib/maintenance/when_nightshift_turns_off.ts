/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { distinctUntilChanged, filter, map, pairwise, type Observable } from 'rxjs';

/**
 * Emits once per runtime on→off flip of the Nightshift feature flag. The flag
 * reads `false` at boot until the feature-flag provider connects, so neither the
 * initial value nor a boot-time `false` → `true` ever counts as turning it off.
 */
export const whenNightshiftTurnsOff = (enabled$: Observable<boolean>): Observable<void> =>
  enabled$.pipe(
    distinctUntilChanged(),
    pairwise(),
    filter(([wasEnabled, isEnabled]) => wasEnabled && !isEnabled),
    map(() => undefined)
  );
