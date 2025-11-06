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
import { OBSERVABILITY_REGISTER_OBSERVABILITY_AGENT_ID } from '@kbn/management-settings-ids';
import { registerObservabilityAgent } from './agent/register_observability_agent';
import type {
  ObservabilityAgentPluginSetup,
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from './types';
import { registerTools } from './tools/register_tools';
import { getIsObservabilityAgentEnabled } from './utils/get_is_obs_agent_enabled';

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
            `Skipping observability agent registration because ${OBSERVABILITY_REGISTER_OBSERVABILITY_AGENT_ID} is disabled`
          );
          return;
        }

        registerTools({ core, plugins, logger: this.logger }).catch((error) => {
          this.logger.error(`Error registering observability agent tools: ${error}`);
        });

        registerObservabilityAgent({ core, plugins, logger: this.logger }).catch((error) => {
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
