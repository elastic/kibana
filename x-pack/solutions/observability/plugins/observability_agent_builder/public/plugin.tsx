/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type {
  ObservabilityAgentBuilderPluginSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from './types';
import { createLogAIInsight, createLogsAIInsightRenderer } from './components/log_ai_insight';
import {
  OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT,
  OBSERVABILITY_AGENT_FEATURE_FLAG,
} from '../common';

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

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(
    core: CoreSetup<
      ObservabilityAgentBuilderPluginStartDependencies,
      ObservabilityAgentBuilderPluginStart
    >,
    plugins: ObservabilityAgentBuilderPluginSetupDependencies
  ): ObservabilityAgentBuilderPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: ObservabilityAgentBuilderPluginStartDependencies
  ): ObservabilityAgentBuilderPluginStart {
    const isObservabilityAgentEnabled = core.featureFlags.getBooleanValue(
      OBSERVABILITY_AGENT_FEATURE_FLAG,
      OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT
    );

    if (plugins.onechat && isObservabilityAgentEnabled) {
      const LogAIInsight = createLogAIInsight({
        onechat: plugins.onechat,
      });

      plugins.discoverShared.features.registry.register({
        id: 'observability-logs-ai-insight',
        render: createLogsAIInsightRenderer(LogAIInsight),
      });
    }
    return {};
  }

  public stop() {}
}
