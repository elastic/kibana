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
import { registerSkill } from '@kbn/onechat-server';
import { createGetAlertsSkill } from './skills/get_alerts_skill';
import { Skill } from '@kbn/agent-skills-common';
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
    // Register get_alerts skill synchronously
    try {
      const getAlertsSkill = createGetAlertsSkill({ coreSetup: core });
      registerSkill(getAlertsSkill);
      this.logger.info('Registered observability.get_alerts skill');
    } catch (error) {
      this.logger.error(`Error registering get_alerts skill: ${error}`);
    }

    // Register Observability Alerts skill
    if (plugins.agentSkills) {
      try {
        class ObservabilityAlertsSkill extends Skill {
          readonly id = 'observability.observability_alerts';
          readonly name = 'Observability Alerts';
          readonly shortDescription = 'Always read this guide before using observability alerts';
          readonly content = `Observability alerts provide insights into issues across APM, Infrastructure, Logs, Uptime, and SLO services. Use this skill to search and retrieve alerts based on various criteria.

=== observability.get_alerts ===

Search and retrieve observability alerts from APM, Infrastructure, Logs, Uptime, and SLO. Supports filtering by time range, status, and natural language queries.

Parameters:
- query (string, optional): Natural language query to search for alerts. Searches across:
  - Alert rule names (weighted 3x)
  - Alert rule descriptions (weighted 2x)
  - Alert reasons
  - Messages
  - Host names
  - Service names
  - Container names
- timeRange (object, optional): Time range filter for alerts. Contains:
  - from (string, required): Start time in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")
  - to (string, required): End time in ISO 8601 format (e.g., "2024-01-02T00:00:00Z")
- status (enum, optional): Filter alerts by status:
  - 'active': Currently active alerts
  - 'recovered': Alerts that have been resolved
- limit (number, optional): Maximum number of alerts to return (default: 10)

Example usage:
1. Get all alerts (default limit of 10):
   tool("invoke_skill", {"skillId":"observability.get_alerts","params":{}})

2. Get active alerts only:
   tool("invoke_skill", {"skillId":"observability.get_alerts","params":{"status":"active"}})

3. Get recovered alerts:
   tool("invoke_skill", {"skillId":"observability.get_alerts","params":{"status":"recovered"}})

4. Search alerts with a query:
   tool("invoke_skill", {"skillId":"observability.get_alerts","params":{"query":"high CPU usage","limit":20}})

5. Get alerts from a time range:
   tool("invoke_skill", {"skillId":"observability.get_alerts","params":{"timeRange":{"from":"2024-01-01T00:00:00Z","to":"2024-01-02T00:00:00Z"}}})

6. Search for active alerts related to a service:
   tool("invoke_skill", {"skillId":"observability.get_alerts","params":{"query":"service-name","status":"active","limit":50}})

Response format:
Returns an array of alert objects, each containing:
- Alert ID, rule name, rule description
- Alert reason and message
- Timestamp and status
- Associated host, service, or container information
- Alert severity and other metadata`;
          readonly filePath = '/skills/observability/get_alerts.md';
        }

        plugins.agentSkills.registerSkill(new ObservabilityAlertsSkill());
        this.logger.info('Registered observability.observability_alerts skill');
      } catch (error) {
        this.logger.error(`Error registering observability alerts skill: ${error}`);
      }
    }

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
