/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleRunContribution } from '@kbn/alerting-plugin/server/task_types/rule_run_contribution';
import {
  getObsAIAssistantConnectorAdapter,
  getObsAIAssistantConnectorType,
} from '../rule_connector';

/**
 * The observability AI assistant rule connector as a rule run sees it: the connector type, so the
 * rule's actions can be enqueued, and the adapter that builds its parameters from the alerts.
 * Kibana executes the connector, so the resources it needs to execute are not available here.
 */
export const contribution: RuleRunContribution = {
  declares: { registersConnectorTypes: true },
  register: ({ actions, alerting }) => {
    actions.registerType(
      getObsAIAssistantConnectorType(async () => {
        throw new Error('The AI assistant connector is executed by Kibana, not a task process');
      }, undefined as never) as never
    );
    alerting.registerConnectorAdapter(getObsAIAssistantConnectorAdapter() as never);
  },
};
