/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, timeout, type Observable } from 'rxjs';

/**
 * Whether telemetry is opted in right now. The telemetry plugin replays its latest decision, so
 * this resolves at once; no plugin, no decision within `timeoutMs`, or a stream error counts as
 * opted out, like `TelemetryConfigProvider.getIsOptedIn()` returning `undefined`.
 */
export const readTelemetryOptIn = async ({
  isOptedIn$,
  timeoutMs,
}: {
  isOptedIn$?: Observable<boolean>;
  timeoutMs: number;
}): Promise<boolean> => {
  if (!isOptedIn$) {
    return false;
  }

  try {
    const optedIn = await firstValueFrom(
      isOptedIn$.pipe(timeout({ first: timeoutMs, with: () => of(false) })),
      { defaultValue: false }
    );
    return optedIn === true;
  } catch {
    return false;
  }
};
