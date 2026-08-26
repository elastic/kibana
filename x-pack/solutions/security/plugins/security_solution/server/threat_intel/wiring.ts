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
import type { ExperimentalFeatures } from '../../common';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginCoreStartDependencies,
  SecuritySolutionPluginSetupDependencies,
  SecuritySolutionPluginStartDependencies,
} from '../plugin_contract';
import { registerThreatIntelInferenceFeatures } from './inference_features';
import { registerRoutes as registerThreatIntelRoutes } from './routes';
import { ensureThreatIntelBootstrap } from './setup/bootstrap_threat_intel';
import {
  PROMOTE_THREAT_INDICATORS_TASK_ID,
  SCRUB_REPORT_CONTENT_TASK_ID,
  registerPromoteThreatIndicatorsTask,
  registerScrubReportContentTask,
  schedulePromoteThreatIndicatorsTask,
  scheduleScrubReportContentTask,
} from './tasks';
import { registerThreatIntelWorkflowSteps } from './workflows/step_types';

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
}

export const createThreatIntelRuntime = (): ThreatIntelRuntime => ({
  bootstrapReady: Promise.resolve(),
});

export const setupThreatIntel = ({
  experimentalFeatures,
  plugins,
  core,
  logger,
  runtime,
}: {
  experimentalFeatures: ExperimentalFeatures;
  plugins: SecuritySolutionPluginSetupDependencies;
  core: SecuritySolutionPluginCoreSetupDependencies;
  logger: Logger;
  runtime: ThreatIntelRuntime;
}): void => {
  if (!experimentalFeatures.threatIntelSupplyEnabled) {
    logger.debug(
      'Threat Intelligence supply not registered. Enable via xpack.securitySolution.enableExperimental: ["threatIntelSupplyEnabled"]'
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

  registerThreatIntelInferenceFeatures(plugins.searchInferenceEndpoints, logger.get('threatIntel'));

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
  logger.info('Threat Intelligence supply routes registered (threatIntelSupplyEnabled is on)');

  if (plugins.workflowsExtensions) {
    registerThreatIntelWorkflowSteps({
      workflowsExtensions: plugins.workflowsExtensions,
      logger: logger.get('threatIntel'),
      getActionsStart: async () => {
        const [, startPlugins] = await core.getStartServices();
        return startPlugins.actions;
      },
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
    });
    registerScrubReportContentTask({
      taskManager: plugins.taskManager,
      coreSetup: core,
      logger: logger.get('threatIntel', 'contentRetention'),
    });
    logger.info(
      'Threat Intelligence IOC indicator-sync and content-retention tasks registered (threatIntelSupplyEnabled is on)'
    );
  } else {
    logger.warn(
      'threatIntelSupplyEnabled is set but the optional `taskManager` plugin is not available, skipping promote task registration.'
    );
  }
};

export const startThreatIntel = ({
  experimentalFeatures,
  plugins,
  core,
  logger,
  runtime,
}: {
  experimentalFeatures: ExperimentalFeatures;
  plugins: SecuritySolutionPluginStartDependencies;
  core: SecuritySolutionPluginCoreStartDependencies;
  logger: Logger;
  runtime: ThreatIntelRuntime;
}): void => {
  runtime.spacesService = plugins.spaces?.spacesService;
  runtime.inference = plugins.inference;
  runtime.searchInferenceEndpoints = plugins.searchInferenceEndpoints;
  runtime.taskManager = plugins.taskManager;

  if (!experimentalFeatures.threatIntelSupplyEnabled) {
    // The task definition is only registered when the flag is on, so a task
    // scheduled during an earlier flag-on boot would otherwise sit in the
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

  // Bootstrap stays detached so a slow or retrying Elasticsearch cannot block
  // Kibana startup, but the promise is retained: route handlers await it
  // before touching the plugin-owned indices, so a request cannot auto-create
  // an index before its template applies (which would leave it permanently
  // mis-mapped). The catch is attached separately so awaiting handlers still
  // observe the rejection while the failure is logged exactly once.
  runtime.bootstrapReady = ensureThreatIntelBootstrap({ esClient, logger: tiLogger }).then(
    () => undefined
  );
  runtime.bootstrapReady.catch((err) => {
    tiLogger.error(`Failed to ensure threat intel bootstrap on start: ${(err as Error).message}`);
  });

  if (plugins.taskManager) {
    const taskManager = plugins.taskManager;
    // Scheduling waits on bootstrap: the promote and retention tasks read and
    // write the same indices, so starting them alongside the migrations races
    // template installation for no benefit. A bootstrap failure means the
    // pipeline has no schema to work against, so the tasks stay unscheduled.
    void runtime.bootstrapReady
      .then(async () => {
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
      })
      .catch(() => {
        tiLogger.error('Threat intel tasks were not scheduled because bootstrap did not complete');
      });
  }
};
