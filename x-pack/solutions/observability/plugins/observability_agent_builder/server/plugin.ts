/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import { registerObservabilityAgent } from './agent/register_observability_agent';
import { registerTools } from './tools/register_tools';
import { registerAttachments } from './attachments/register_attachments';
import type {
  ObservabilityAgentBuilderPluginSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from './types';
import { ObservabilityAgentBuilderDataRegistry } from './data_registry/data_registry';
import { registerServerRoutes } from './routes/register_routes';

export class ObservabilityAgentBuilderPlugin
  implements
    Plugin<
      ObservabilityAgentBuilderPluginSetup,
      ObservabilityAgentBuilderPluginStart,
      ObservabilityAgentBuilderPluginSetupDependencies,
      ObservabilityAgentBuilderPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly dataRegistry: ObservabilityAgentBuilderDataRegistry;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.dataRegistry = new ObservabilityAgentBuilderDataRegistry(this.logger);
  }

  public setup(
    core: CoreSetup<
      ObservabilityAgentBuilderPluginStartDependencies,
      ObservabilityAgentBuilderPluginStart
    >,
    plugins: ObservabilityAgentBuilderPluginSetupDependencies
  ): ObservabilityAgentBuilderPluginSetup {
    registerObservabilityAgent({ core, plugins, logger: this.logger }).catch((error) => {
      this.logger.error(`Error registering observability agent: ${error}`);
    });

    registerTools({
      core,
      plugins,
      dataRegistry: this.dataRegistry,
      logger: this.logger,
    }).catch((error) => {
      this.logger.error(`Error registering observability tools: ${error}`);
    });

    registerAttachments({
      core,
      plugins,
      logger: this.logger,
      dataRegistry: this.dataRegistry,
    }).catch((error) => {
      this.logger.error(`Error registering observability attachments: ${error}`);
    });

    registerServerRoutes({ core, plugins, logger: this.logger, dataRegistry: this.dataRegistry });

    return {
      registerDataProvider: (id, provider) => this.dataRegistry.registerDataProvider(id, provider),
    };
  }

  public start(
    _core: CoreStart,
    _plugins: ObservabilityAgentBuilderPluginStartDependencies
  ): ObservabilityAgentBuilderPluginStart {
    return {};
  }

  public stop() {}
}
