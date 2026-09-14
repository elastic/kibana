/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import type { KbnClient } from '@kbn/scout-security';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';

const SECURITY_INDEX_PATTERNS = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'traces-apm*',
  'winlogbeat-*',
  '-*elastic-cloud-logs-*',
];

export interface SeededAutomatedResponseActionsRule {
  id: string;
  name: string;
}

/**
 * Creates an enabled query rule that fires on sshd process events from the
 * enrolled Endpoint agent and attaches isolate / suspend-process / kill-process.
 *
 * Created after the host is healthy so the first interval can produce an alert
 * without a UI enable/disable toggle.
 */
export const createEnabledRuleWithAutomatedResponseActions = async (
  kbnClient: KbnClient,
  agentId: string
): Promise<SeededAutomatedResponseActionsRule> => {
  const name = `automated-response-actions-${Date.now()}`;

  const { data } = await kbnClient.request<{ id: string; name: string }>({
    method: 'POST',
    path: DETECTION_ENGINE_RULES_URL,
    headers: PUBLIC_API_HEADERS,
    body: {
      type: 'query',
      index: SECURITY_INDEX_PATTERNS,
      filters: [],
      language: 'kuery',
      query: `agent.id: "${agentId}" and process.name: "sshd"`,
      author: [],
      false_positives: [],
      references: [],
      risk_score: 21,
      risk_score_mapping: [],
      severity: 'low',
      severity_mapping: [],
      threat: [],
      name,
      description: name,
      rule_id: name,
      tags: [],
      license: '',
      interval: '1m',
      from: 'now-360s',
      to: 'now',
      actions: [],
      enabled: true,
      throttle: 'no_actions',
      response_actions: [
        {
          params: { command: 'isolate', comment: 'Isolate host' },
          action_type_id: '.endpoint',
        },
        {
          params: {
            command: 'suspend-process',
            comment: 'Suspend host',
            config: { field: 'entity_id', overwrite: false },
          },
          action_type_id: '.endpoint',
        },
        {
          params: {
            command: 'kill-process',
            comment: 'Kill host',
            config: { field: '', overwrite: true },
          },
          action_type_id: '.endpoint',
        },
      ],
    },
    retries: 0,
  });

  return { id: data.id, name: data.name };
};
