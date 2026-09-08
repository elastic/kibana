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
import { registerTools } from './tools/register_tools';
import { registerAttachments } from './attachments/register_attachments';
import { registerSkills } from './skills/register_skills';
import type {
  ObservabilityAgentBuilderPluginSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from './types';
import { ObservabilityAgentBuilderDataRegistry } from './data_registry/data_registry';
import { registerServerRoutes } from './routes/register_routes';
import {
  observabilityParentFeature,
  observabilityAiInsightsInferenceFeatures,
} from './inference_feature';

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
    registerSkills({ plugins, logger: this.logger });

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

    if (plugins.searchInferenceEndpoints) {
      plugins.searchInferenceEndpoints.features.register(observabilityParentFeature);

      const failures: string[] = [];
      for (const feature of observabilityAiInsightsInferenceFeatures) {
        const result = plugins.searchInferenceEndpoints.features.register(feature);
        if (!result.ok) {
          failures.push(`${feature.featureId}: ${result.error}`);
        }
      }
      if (failures.length) {
        this.logger.warn(
          `Failed to register inference endpoints for Observability AI Insights: ${failures.join(
            '; '
          )}`
        );
      } else {
        this.logger.debug(
          'Successfully registered inference endpoints for Observability AI Insights'
        );
      }
    }

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
