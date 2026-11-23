/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

/** The source write waits for this listener, so a stuck install must not hold it forever. */
const INSTALL_WAIT_TIMEOUT_MS = 30_000;

export interface EnqueueSourceReconciliationArgs {
  sourceId: string;
  sourceSlug: string;
  request: KibanaRequest;
}

export interface CreateEnqueueSourceReconciliationOptions {
  whenInstalled: () => Promise<void>;
  isAvailable: () => Promise<boolean>;
  execute: (args: EnqueueSourceReconciliationArgs) => Promise<void>;
  logger: Logger;
}

/**
 * Resolves whether to run the workflow. Waiting for the install and checking availability share one
 * deadline, because both can be slow. At the deadline it answers yes, so the workflow lookup
 * reports whatever is wrong instead of the change being dropped silently.
 */
const isReadyToRun = async ({
  whenInstalled,
  isAvailable,
}: Pick<
  CreateEnqueueSourceReconciliationOptions,
  'whenInstalled' | 'isAvailable'
>): Promise<boolean> => {
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(true), INSTALL_WAIT_TIMEOUT_MS);
  });
  const ready = (async () => {
    await whenInstalled().catch(() => {});
    return isAvailable();
  })();
  try {
    return await Promise.race([ready, timedOut]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Runs the source reconciliation workflow once the managed workflows are installed.
 *
 * A source can change while the install kicked off at plugin start is still running, and the
 * reconciliation workflow does not exist until it finishes. Waiting for it keeps that change from
 * being dropped. The wait ends after 30 seconds. A failed install is not rethrown here: the
 * workflow lookup then reports the real problem. When the feature is unavailable nothing is
 * installed, so there is nothing to run.
 */
export const createEnqueueSourceReconciliation = ({
  whenInstalled,
  isAvailable,
  execute,
  logger,
}: CreateEnqueueSourceReconciliationOptions): ((
  args: EnqueueSourceReconciliationArgs
) => Promise<void>) => {
  return async (args) => {
    if (!(await isReadyToRun({ whenInstalled, isAvailable }))) {
      logger.debug(
        `significantEvents: unavailable, skipping reconciliation of source ${args.sourceId}`
      );
      return;
    }
    await execute(args);
  };
};
