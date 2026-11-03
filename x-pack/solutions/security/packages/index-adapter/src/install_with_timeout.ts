/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, type Observable } from 'rxjs';
import { withTimeout } from '@kbn/std';

const INSTALLATION_TIMEOUT = 20 * 60 * 1000; // 20 minutes

interface InstallWithTimeoutOpts {
  description?: string;
  installFn: () => Promise<void>;
  pluginStop$: Observable<void>;
  timeoutMs?: number;
}

export class InstallShutdownError extends Error {
  constructor() {
    super('Server is stopping; must stop all async operations');
    Object.setPrototypeOf(this, InstallShutdownError.prototype);
  }
}

export const installWithTimeout = async ({
  description,
  installFn,
  pluginStop$,
  timeoutMs = INSTALLATION_TIMEOUT,
}: InstallWithTimeoutOpts): Promise<void> => {
  try {
    const stopped = new Promise<never>((_, reject) => {
      firstValueFrom(pluginStop$).then(() => {
        reject(new InstallShutdownError());
      });
    });
    const outcome = await withTimeout({
      promise: Promise.race([installFn(), stopped]),
      timeoutMs,
    });
    if (outcome.timedout) {
      throw new Error(`Timeout: it took more than ${timeoutMs}ms`);
    }
  } catch (e) {
    if (e instanceof InstallShutdownError) {
      throw e;
    } else {
      const reason = e?.message || 'Unknown reason';
      throw new Error(
        `Failure during installation${description ? ` of ${description}` : ''}. ${reason}`
      );
    }
  }
};
