/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAd2ScenarioAlertIds } from '../scenario_registry';
import type { AttackDiscoveryAgentBuilderExample } from '../types';

export interface ScenarioRegistryProvidedAlertsConfig {
  readonly scenarioKey: string;
  readonly host: string;
  readonly chainLabel: string;
  readonly title: string;
  readonly summaryMarkdown: string;
  readonly detailsMarkdown: string;
  readonly entitySummaryMarkdown: string;
  readonly mitreAttackTactics: string[];
  readonly criteria: readonly string[];
}

export const buildScenarioRegistryProvidedAlertsExample = (
  config: ScenarioRegistryProvidedAlertsConfig
): AttackDiscoveryAgentBuilderExample => {
  const alertIds = [...getAd2ScenarioAlertIds(config.scenarioKey)];

  return {
    input: {
      question: `Run Attack Discovery for the four provided alerts (${alertIds.join(
        ', '
      )}) from the ${config.chainLabel} on ${config.host}. Return the final validated discovery.`,
      triageType: 'provided-alerts',
      expectedSkills: ['attack-discovery-generator'],
      expectedToolPath: ['security.attack-discovery.run'],
      attachments: [{ type: 'security.alerts', data: { alertIds } }],
    },
    output: {
      expectedToolPath: ['security.attack-discovery.run'],
      expectedWorkflowStages: ['generation', 'validation'],
      expectedRetrievedAlertCount: null,
      expectedPassedAlertCount: alertIds.length,
      attackDiscoveries: [
        {
          title: config.title,
          summaryMarkdown: config.summaryMarkdown,
          detailsMarkdown: config.detailsMarkdown,
          entitySummaryMarkdown: config.entitySummaryMarkdown,
          mitreAttackTactics: [...config.mitreAttackTactics],
          alertIds,
        },
      ],
      criteria: [
        ...config.criteria,
        'Each insight includes non-empty title, summaryMarkdown, detailsMarkdown, and alertIds.',
        `The alertIds include all four scenario alerts: ${alertIds.join(', ')}.`,
      ],
    },
    metadata: {
      alertCount: alertIds.length,
      fixture: 'scenario-registry',
      scenarioKey: config.scenarioKey,
      seedProfile: 'clean',
    },
  };
};
