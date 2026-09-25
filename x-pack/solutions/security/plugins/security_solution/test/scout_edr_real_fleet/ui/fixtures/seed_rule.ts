/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import type { EsClient, KbnClient } from '@kbn/scout-security';
import { getHostVmClient } from '../../../../scripts/endpoint/common/vm_services';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const ALERTS_INDEX = '.alerts-security.alerts-default';

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
 * Runs `uname` on the enrolled VM so Endpoint emits a process event after the
 * detection rule is enabled.
 *
 * CI uses `vagrant ssh -- <command>`, which forwards extra args to the SSH
 * client. Short flags such as `-t` or `-c` are eaten there (exit 255) and never
 * run on the guest, so this command must not take flags.
 */
export const triggerMatchingProcessEvent = async (hostname: string): Promise<void> => {
  await getHostVmClient(hostname).exec('uname');
};

/**
 * Creates an enabled query rule that fires on uname process events from the
 * enrolled Endpoint agent and attaches isolate / suspend-process / kill-process.
 *
 * Call `triggerMatchingProcessEvent` after this so a matching process event
 * exists inside the rule lookback window.
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
      query: `agent.id: "${agentId}" and process.name: "uname"`,
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

export const deleteSeededRule = async (kbnClient: KbnClient, ruleId: string): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: DETECTION_ENGINE_RULES_URL,
    query: { id: ruleId },
    headers: PUBLIC_API_HEADERS,
    ignoreErrors: [404],
    retries: 0,
  });
};

export const deleteAlertsForRule = async (esClient: EsClient, ruleId: string): Promise<void> => {
  await esClient.indices.refresh({ index: ALERTS_INDEX, ignore_unavailable: true });
  await esClient.deleteByQuery({
    index: ALERTS_INDEX,
    ignore_unavailable: true,
    query: {
      term: { 'kibana.alert.rule.uuid': ruleId },
    },
    conflicts: 'proceed',
    refresh: true,
  });
};
