/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginCoreStartDependencies,
  SecuritySolutionPluginSetupDependencies,
  SecuritySolutionPluginStartDependencies,
} from '../plugin_contract';
import { registerRoutes as registerThreatIntelRoutes } from './routes';
import { ensureThreatIntelBootstrap } from './setup/bootstrap_threat_intel';
import { ensureIndicatorAliasForSpace } from './setup/indicator_alias';
import {
  PROMOTE_THREAT_INDICATORS_TASK_ID,
  SCRUB_REPORT_CONTENT_TASK_ID,
  registerPromoteThreatIndicatorsTask,
  registerScrubReportContentTask,
  schedulePromoteThreatIndicatorsTask,
  scheduleScrubReportContentTask,
} from './tasks';
import { registerThreatIntelWorkflowSteps } from './workflows/step_types';
import {
  installThreatIntelManagedWorkflowsForSpaces,
  reconcileThreatIntelAttributeWorkflowsForSpaces,
} from '../workflows/security_managed_workflows';

/**
 * After the bounded first-boot bootstrap budget is exhausted, keep retrying at
 * this interval so late ML / inference availability can recover without a Kibana
 * restart. Kept on the runtime so unit tests can shorten it.
 */
export const THREAT_INTEL_BOOTSTRAP_BACKGROUND_RETRY_MS = 30_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cross-lifecycle state the pipeline needs. Setup registers routes that only
 * resolve these at request time, and start is what fills them in, so they cannot be
 * plain parameters.
 */
export interface ThreatIntelRuntime {
  spacesService?: SpacesServiceStart;
  inference?: InferenceServerStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  taskManager?: TaskManagerStartContract;
  bootstrapReady: Promise<void>;
  /**
   * Set in start when AlertZero is on. The promote task calls this every run to
   * install `attribute_alerts_to_reports` into spaces created since boot.
   */
  reconcileAttributeWorkflows?: () => Promise<void>;
  /**
   * Delay between background bootstrap retries after the first bounded failure.
   * Defaults to {@link THREAT_INTEL_BOOTSTRAP_BACKGROUND_RETRY_MS}.
   */
  bootstrapBackgroundRetryMs?: number;
}

export const createThreatIntelRuntime = (): ThreatIntelRuntime => ({
  bootstrapReady: Promise.resolve(),
});

/**
 * Threat-intel supply shares AlertZero's soft-enable switch
 * (`xpack.alertzero.enabled`). Missing or disabled AlertZero means supply stays off.
 */
export const isThreatIntelSupplyEnabled = (alertzero?: { isEnabled: boolean }): boolean =>
  alertzero?.isEnabled === true;

export const setupThreatIntel = ({
  alertZeroEnabled,
  plugins,
  core,
  logger,
  runtime,
}: {
  alertZeroEnabled: boolean;
  plugins: SecuritySolutionPluginSetupDependencies;
  core: SecuritySolutionPluginCoreSetupDependencies;
  logger: Logger;
  runtime: ThreatIntelRuntime;
}): void => {
  if (!alertZeroEnabled) {
    logger.debug(
      'Threat Intelligence supply not registered. Enable via xpack.alertzero.enabled: true'
    );
    return;
  }

  // Fail closed until `startThreatIntel` installs the real promise.
  //
  // `createThreatIntelRuntime` defaults this to an already-resolved promise so that a
  // flag-off boot never leaves a handler awaiting forever. With the flag on that
  // default is backwards: routes are registered here in setup and capture
  // `getBootstrapReady`, so anything reaching a handler before start would sail
  // through the readiness gate and touch the plugin-owned indices before templates and
  // migrations had run, which is the exact auto-create-then-mis-map race the gate
  // exists to prevent. Kibana's lifecycle makes that window small, but a guard whose
  // default is "open" is the wrong shape regardless.
  //
  // The no-op catch keeps Node from reporting an unhandled rejection in the window
  // before start overwrites it; handlers that await it still observe the rejection.
  runtime.bootstrapReady = Promise.reject(
    new Error('Threat intelligence bootstrap has not started yet')
  );
  runtime.bootstrapReady.catch(() => {});

  const router = core.http.createRouter();
  registerThreatIntelRoutes({
    router,
    logger: logger.get('threatIntel'),
    getSpacesService: () => runtime.spacesService,
    getInference: () => runtime.inference,
    getSearchInferenceEndpoints: () => runtime.searchInferenceEndpoints,
    getTaskManager: () => runtime.taskManager,
    getBootstrapReady: () => runtime.bootstrapReady,
  });
  logger.info('Threat Intelligence supply routes registered (xpack.alertzero.enabled is on)');

  if (plugins.workflowsExtensions) {
    registerThreatIntelWorkflowSteps({
      workflowsExtensions: plugins.workflowsExtensions,
      logger: logger.get('threatIntel'),
    });
  } else {
    logger.debug(
      'workflowsExtensions plugin not available, skipping threat_intel.fetch_source registration'
    );
  }

  // Bootstrap runs from `startThreatIntel`, not here — templates, migrations,
  // and the seed check are the same work and running them twice per boot just
  // doubles the template PUTs and mapping scans.

  if (plugins.taskManager) {
    registerPromoteThreatIndicatorsTask({
      taskManager: plugins.taskManager,
      coreSetup: core,
      logger: logger.get('threatIntel', 'iocIndicatorSync'),
      getReconcileAttributeWorkflows: () =>
        runtime.reconcileAttributeWorkflows?.() ?? Promise.resolve(),
    });
    registerScrubReportContentTask({
      taskManager: plugins.taskManager,
      coreSetup: core,
      logger: logger.get('threatIntel', 'contentRetention'),
    });
    logger.info(
      'Threat Intelligence IOC indicator-sync and content-retention tasks registered (xpack.alertzero.enabled is on)'
    );
  } else {
    logger.warn(
      'xpack.alertzero.enabled is set but the optional `taskManager` plugin is not available, skipping promote task registration.'
    );
  }
};

export const startThreatIntel = ({
  alertZeroEnabled,
  plugins,
  core,
  logger,
  runtime,
}: {
  alertZeroEnabled: boolean;
  plugins: SecuritySolutionPluginStartDependencies;
  core: SecuritySolutionPluginCoreStartDependencies;
  logger: Logger;
  runtime: ThreatIntelRuntime;
}): void => {
  runtime.spacesService = plugins.spaces?.spacesService;
  runtime.inference = plugins.inference;
  runtime.searchInferenceEndpoints = plugins.searchInferenceEndpoints;
  runtime.taskManager = plugins.taskManager;

  if (!alertZeroEnabled) {
    // The task definition is only registered when AlertZero is on, so a task
    // scheduled during an earlier enabled boot would otherwise sit in the
    // Task Manager index forever, un-runnable and invisible.
    if (plugins.taskManager) {
      for (const taskId of [PROMOTE_THREAT_INDICATORS_TASK_ID, SCRUB_REPORT_CONTENT_TASK_ID]) {
        void plugins.taskManager.removeIfExists(taskId).catch((err: Error) => {
          logger.warn(`Failed to remove the orphaned threat intel task ${taskId}: ${err.message}`);
        });
      }
    }
    return;
  }

  const esClient = core.elasticsearch.client.asInternalUser;
  const tiLogger = logger.get('threatIntel');
  const workflowsExtensions = plugins.workflowsExtensions;
  const taskManager = plugins.taskManager;
  const retryDelayMs =
    runtime.bootstrapBackgroundRetryMs ?? THREAT_INTEL_BOOTSTRAP_BACKGROUND_RETRY_MS;

  // Managed-workflow install at boot moved to `installSecurityManagedWorkflowsAndMarkReady`
  // so alert_analysis and TI share one `ready()` call. The promote task uses this
  // callback to catch spaces created after boot.
  if (workflowsExtensions) {
    runtime.reconcileAttributeWorkflows = () =>
      reconcileThreatIntelAttributeWorkflowsForSpaces({
        workflowsExtensions,
        core,
        logger: tiLogger,
      });
  }

  const scheduleThreatIntelTasks = async (): Promise<void> => {
    await ensureIndicatorAliasForSpace({
      esClient,
      spaceId: 'default',
      logger: tiLogger,
    }).catch(() => {});

    if (!taskManager) {
      return;
    }

    await schedulePromoteThreatIndicatorsTask({
      taskManager,
      logger: logger.get('threatIntel', 'iocIndicatorSync'),
    }).catch((err) => {
      tiLogger.error(`Failed to schedule Promote threat indicators task: ${err.message}`);
    });

    await scheduleScrubReportContentTask({
      taskManager,
      logger: logger.get('threatIntel', 'contentRetention'),
    }).catch((err) => {
      tiLogger.error(`Failed to schedule threat report content retention task: ${err.message}`);
    });
  };

  const installThreatIntelWorkflowsAfterRecovery = async (): Promise<void> => {
    if (!workflowsExtensions) {
      return;
    }
    await installThreatIntelManagedWorkflowsForSpaces({
      workflowsExtensions,
      core,
      logger: tiLogger,
    });
  };

  /**
   * Bootstrap stays detached so a slow or retrying Elasticsearch cannot block
   * Kibana startup. Route handlers await `bootstrapReady` before touching
   * plugin-owned indices (fail-closed).
   *
   * The first call uses the bounded retry budget inside `ensureThreatIntelBootstrap`.
   * If that rejects, readiness stays rejected (routes answer 503) and a background
   * loop keeps retrying at a longer interval. On late success we replace
   * `bootstrapReady` with a resolved promise, schedule TI tasks, and install TI
   * managed workflows that the boot installer skipped when bootstrap first failed.
   */
  const firstBootstrap = ensureThreatIntelBootstrap({ esClient, logger: tiLogger }).then(
    () => undefined
  );
  runtime.bootstrapReady = firstBootstrap;
  runtime.bootstrapReady.catch((err) => {
    tiLogger.error(`Failed to ensure threat intel bootstrap on start: ${(err as Error).message}`);
  });

  void firstBootstrap
    .then(async () => {
      await scheduleThreatIntelTasks();
    })
    .catch(() => {
      tiLogger.error(
        'Threat intel tasks were not scheduled because bootstrap did not complete; retrying bootstrap in the background'
      );
      void (async () => {
        let bootstrapRecovered = false;
        for (;;) {
          await sleep(retryDelayMs);
          try {
            if (!bootstrapRecovered) {
              await ensureThreatIntelBootstrap({ esClient, logger: tiLogger });
              runtime.bootstrapReady = Promise.resolve();
              bootstrapRecovered = true;
              tiLogger.info(
                'Threat intel bootstrap recovered after a late retry; installing managed workflows and scheduling tasks'
              );
              await scheduleThreatIntelTasks();
            }
            await installThreatIntelWorkflowsAfterRecovery();
            return;
          } catch (err) {
            tiLogger.warn(
              bootstrapRecovered
                ? `Threat intel managed-workflow install after recovery failed; will retry: ${
                    (err as Error).message
                  }`
                : `Threat intel background bootstrap retry failed: ${(err as Error).message}`
            );
          }
        }
      })();
    });
};
