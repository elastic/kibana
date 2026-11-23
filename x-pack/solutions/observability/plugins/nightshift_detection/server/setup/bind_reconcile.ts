/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Logger, OnSetup, PluginSetup } from '@kbn/core-di';
import type { NightshiftSourcesServerSetup } from '@kbn/nightshift-sources-plugin/server';
import { DetectionEngineSystemClient } from '../lib/engine/tokens';
import { getErrorMessage } from '../lib/errors/get_error_message';
import { ReconcileStarter } from '../lib/reconcile/reconcile_starter';
import { ScopedReconcileRunner } from '../lib/reconcile/scoped_reconcile_runner';
import { SpaceReconcileLock } from '../lib/reconcile/space_reconcile_lock';

/** Binds what reconciles the resources the strategies need, such as their alerting rules. */
export function bindReconcile({ bind }: ContainerModuleLoadOptions): void {
  // Shares `.kibana_locks` with the run and setup locks; the purposes never block each other.
  bind(SpaceReconcileLock)
    .toResolvedValue(
      (esClient, logger) => new SpaceReconcileLock(esClient, logger.get('reconcile-lock')),
      [DetectionEngineSystemClient, Logger]
    )
    .inSingletonScope();
  bind(ScopedReconcileRunner).toSelf().inSingletonScope();
  bind(ReconcileStarter).toSelf().inSingletonScope();

  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger).get('reconcile');

    container
      .get(PluginSetup<NightshiftSourcesServerSetup>('nightshiftSources'))
      .onSourceChange(async ({ request, source }) => {
        // Fire and forget: the sources plugin awaits its listeners, and the write already
        // committed, so a slow or failed start must neither delay nor fail it. The six-hour sweep
        // catches a start that was lost. Resolved here, as the starter reads start contracts.
        void container
          .get(ReconcileStarter)
          .start(request)
          .catch((error) => {
            logger.warn(
              `Could not start the reconciliation after source [${
                source.id
              }] changed; the scheduled one catches up: ${getErrorMessage(error)}`
            );
          });
      });
  });
}
