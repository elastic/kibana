/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

export interface WriteGate {
  /** True once `ensure` has succeeded. Writes to the index must wait for it. */
  isOpen: () => boolean;
  stop: () => void;
}

// A failed install is usually Elasticsearch security that is not ready yet, so the first retries
// are quick. The last delay repeats until the install succeeds or the plugin stops.
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];

/**
 * Runs `ensure` until it reports success, and keeps the gate closed until then. `start` cannot
 * return a promise, so callers read `isOpen` as it changes.
 */
export const startWriteGate = ({
  ensure,
  logger,
  label,
  retryDelaysMs = RETRY_DELAYS_MS,
}: {
  ensure: () => Promise<boolean>;
  logger: Logger;
  label: string;
  retryDelaysMs?: readonly number[];
}): WriteGate => {
  let open = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const attempt = (failures: number): void => {
    ensure().then(
      (installed) => {
        open = installed;
        if (!installed) retry(failures);
      },
      (error) => {
        logger.warn(`${label} index template install failed: ${String(error)}`);
        retry(failures);
      }
    );
  };

  const retry = (failures: number): void => {
    if (stopped) return;
    const delay = retryDelaysMs[Math.min(failures, retryDelaysMs.length - 1)];
    timer = setTimeout(() => attempt(failures + 1), delay);
    // Fake timers in tests have no `unref`.
    timer.unref?.();
  };

  attempt(0);

  return {
    isOpen: () => open,
    stop: () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
    },
  };
};
