/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

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
 * Runs the source reconciliation workflow once the managed workflows are installed.
 *
 * A source can change while the install kicked off at plugin start is still running, and the
 * reconciliation workflow does not exist until it finishes. Waiting for it keeps that change from
 * being dropped. A failed install is not rethrown here: the workflow lookup then reports the real
 * problem. When the feature is unavailable nothing is installed, so there is nothing to run.
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
    await whenInstalled().catch(() => {});
    if (!(await isAvailable())) {
      logger.debug(
        `significantEvents: unavailable, skipping reconciliation of source ${args.sourceId}`
      );
      return;
    }
    await execute(args);
  };
};
