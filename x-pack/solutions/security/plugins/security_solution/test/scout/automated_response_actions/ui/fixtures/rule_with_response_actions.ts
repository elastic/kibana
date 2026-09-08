/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-security';
import { CUSTOM_QUERY_RULE, PUBLIC_API_HEADERS } from '@kbn/scout-security';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';

export interface CreatedRuleWithResponseActions {
  id: string;
  name: string;
}

/**
 * Creates a disabled custom-query rule with isolate / suspend-process / kill-process
 * response actions (same payload as the Cypress loadRule helper).
 */
export const createRuleWithResponseActions = async (
  kbnClient: KbnClient
): Promise<CreatedRuleWithResponseActions> => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const name = `Scout ARA rule ${suffix}`;

  const { data } = await kbnClient.request<CreatedRuleWithResponseActions>({
    method: 'POST',
    path: DETECTION_ENGINE_RULES_URL,
    headers: PUBLIC_API_HEADERS,
    retries: 0,
    body: {
      type: 'query',
      index: CUSTOM_QUERY_RULE.index,
      filters: [],
      language: 'kuery',
      query: '_id: *',
      author: [],
      false_positives: [],
      references: [],
      risk_score: 21,
      risk_score_mapping: [],
      severity: 'low',
      severity_mapping: [],
      threat: [],
      name,
      description: 'Scout automated response actions edit fixture',
      tags: [],
      license: '',
      interval: '1m',
      from: 'now-360s',
      to: 'now',
      actions: [],
      enabled: false,
      throttle: 'no_actions',
      rule_id: `scout-ara-${suffix}`,
      response_actions: [
        {
          params: { command: 'isolate' as const, comment: 'Isolate host' },
          action_type_id: '.endpoint' as const,
        },
        {
          params: {
            command: 'suspend-process' as const,
            comment: 'Suspend host',
            config: {
              field: 'entity_id',
              overwrite: false,
            },
          },
          action_type_id: '.endpoint' as const,
        },
        {
          params: {
            command: 'kill-process' as const,
            comment: 'Kill host',
            config: {
              field: '',
              overwrite: true,
            },
          },
          action_type_id: '.endpoint' as const,
        },
      ],
    },
  });

  return data;
};

export const deleteRule = async (kbnClient: KbnClient, ruleId: string): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `${DETECTION_ENGINE_RULES_URL}?id=${encodeURIComponent(ruleId)}`,
    headers: PUBLIC_API_HEADERS,
    retries: 0,
  });
};
