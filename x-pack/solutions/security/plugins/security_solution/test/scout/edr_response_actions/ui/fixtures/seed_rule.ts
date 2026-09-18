/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_QUERY_RULE, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import type { KbnClient } from '@kbn/scout-security';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';

export interface SeededResponseActionsRule {
  id: string;
}

export const createRuleWithAutomatedResponseActions = async (
  kbnClient: KbnClient,
  spaceId: string,
  name: string
): Promise<SeededResponseActionsRule> => {
  const { data } = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: `/s/${spaceId}${DETECTION_ENGINE_RULES_URL}`,
    headers: PUBLIC_API_HEADERS,
    body: {
      ...CUSTOM_QUERY_RULE,
      name,
      description: name,
      rule_id: name,
      enabled: false,
      language: 'kuery',
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

  return { id: data.id };
};
