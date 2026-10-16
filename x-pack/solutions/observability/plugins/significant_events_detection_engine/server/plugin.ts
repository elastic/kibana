/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { DETECTION_ENGINE_PLUGIN_ID } from '../common';
import type { DetectionEngineConfig } from './config';
import {
  createDiscoveryAgentInstaller,
  registerDiscoveryAgentType,
} from './lib/agent/discovery_agent_type';
import {
  createEngineScopeFactory,
  toEngineLimits,
  type CreateEngineScope,
} from './lib/engine/engine_scope';
import { getErrorMessage } from './lib/errors';
import { createAutoRunScheduler, type IAutoRunScheduler } from './lib/scheduler/auto_run';
import {
  activityDataStream,
  detectionsDataStream,
  observationsDataStream,
  runsDataStream,
} from './lib/storage/data_streams';
import { createManagedIndexInstaller } from './lib/storage/managed_index';
import { detectionEngineRouteRepository } from './routes';
import type { DetectionEngineSetupDependencies, DetectionEngineStartDependencies } from './types';

interface StartServices {
  createScope: CreateEngineScope;
  scheduler: IAutoRunScheduler;
}

/**
 * The Significant Events detection engine. It owns no UI: the Significant Events app reads and
 * drives it through its internal HTTP API. Strategies run as Alerting v2 rules, the schedule is
 * a managed workflow, and the discovery step is an Agent Builder agent.
 */
export class DetectionEnginePlugin
  implements Plugin<void, void, DetectionEngineSetupDependencies, DetectionEngineStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: DetectionEngineConfig;
  private readonly isDev: boolean;
  private resolveStart!: (services: StartServices) => void;
  private readonly startServices = new Promise<StartServices>((resolve) => {
    this.resolveStart = resolve;
  });
  private setupPlugins?: DetectionEngineSetupDependencies;

  constructor(context: PluginInitializerContext<DetectionEngineConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.isDev = context.env.mode.dev;
  }

  public setup(
    core: CoreSetup<DetectionEngineStartDependencies>,
    plugins: DetectionEngineSetupDependencies
  ): void {
    this.setupPlugins = plugins;
    core.dataStreams.registerDataStream(observationsDataStream);
    core.dataStreams.registerDataStream(detectionsDataStream);
    core.dataStreams.registerDataStream(activityDataStream);
    core.dataStreams.registerDataStream(runsDataStream);
    if (plugins.agentBuilder) {
      registerDiscoveryAgentType(plugins.agentBuilder);
    }
    plugins.workflowsExtensions?.registerManagedWorkflowOwner(DETECTION_ENGINE_PLUGIN_ID);

    registerRoutes({
      repository: detectionEngineRouteRepository,
      dependencies: { getStartServices: () => this.startServices },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });
  }

  public start(core: CoreStart, plugins: DetectionEngineStartDependencies): void {
    const managedClient: Promise<PluginScopedManagedWorkflowsApi> | undefined =
      plugins.workflowsExtensions
        ?.initManagedWorkflowsClient(DETECTION_ENGINE_PLUGIN_ID)
        .then(async (client) => {
          // Lets the platform upgrade installed schedules to the current definition.
          await client.ready().catch((error) => {
            this.logger.warn(
              `Detection engine schedules were not upgraded: ${getErrorMessage(error)}`
            );
          });
          return client;
        });

    this.resolveStart({
      createScope: createEngineScopeFactory({
        core,
        plugins,
        logger: this.logger.get('engine'),
        limits: toEngineLimits(this.config),
        installer: createManagedIndexInstaller({
          esClient: core.elasticsearch.client.asInternalUser,
          logger: this.logger.get('storage'),
        }),
        agentInstaller: plugins.agentBuilder
          ? createDiscoveryAgentInstaller({
              agentBuilder: plugins.agentBuilder,
              logger: this.logger.get('agent'),
            })
          : undefined,
      }),
      scheduler: createAutoRunScheduler({
        getManagedClient: () => managedClient,
        management: this.setupPlugins?.workflowsManagement?.management,
        logger: this.logger.get('scheduler'),
      }),
    });
  }
}
