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
import { getIsObservabilityAgentEnabled } from './utils/get_is_obs_agent_enabled';
import { OBSERVABILITY_AGENT_FEATURE_FLAG } from '../common/constants';
import type {
  ObservabilityAgentPluginSetup,
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from './types';

export class ObservabilityAgentPlugin
  implements
    Plugin<
      ObservabilityAgentPluginSetup,
      ObservabilityAgentPluginStart,
      ObservabilityAgentPluginSetupDependencies,
      ObservabilityAgentPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(
    core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>,
    plugins: ObservabilityAgentPluginSetupDependencies
  ): ObservabilityAgentPluginSetup {
    getIsObservabilityAgentEnabled(core)
      .then((isObservabilityAgentEnabled) => {
        if (!isObservabilityAgentEnabled) {
          this.logger.debug(
            `Skipping observability agent registration because feature flag "${OBSERVABILITY_AGENT_FEATURE_FLAG}" is set to false`
          );
          return;
        }

        registerTools({ core, plugins, logger: this.logger }).catch((error) => {
          this.logger.error(`Error registering observability agent tools: ${error}`);
        });

        registerObservabilityAgent({ plugins, logger: this.logger }).catch((error) => {
          this.logger.error(`Error registering observability agent: ${error}`);
        });
      })
      .catch((error) => {
        this.logger.error(`Error checking whether the observability agent is enabled: ${error}`);
      });

    return {};
  }

  public start(
    _core: CoreStart,
    _plugins: ObservabilityAgentPluginStartDependencies
  ): ObservabilityAgentPluginStart {
    return {};
  }

  public stop() {}
}
