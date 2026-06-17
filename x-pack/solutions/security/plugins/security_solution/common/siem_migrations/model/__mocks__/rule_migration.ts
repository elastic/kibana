/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationRule } from '../rule_migration.gen';

export const getRuleMigrationRuleMock = (
  overrides?: Partial<RuleMigrationRule>
): RuleMigrationRule => {
  return {
    id: 'gddQe5kB3n2mXgTTvwKq',
    migration_id: '2495b934-5ff2-4052-88a2-b6977259eafc',
    original_rule: {
      id: 'https://test.elastic.com',
      vendor: 'splunk',
      title: 'Access - Excessive Failed Logins - Rule',
      description:
        'Detects excessive number of failed login attempts (this is likely a brute force attack)',
      query: 'very nice test query',
      query_language: 'spl',
    },
    '@timestamp': '2025-09-24T10:41:53.577Z',
    status: 'completed',
    created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_at: '2025-09-24T11:36:38.089Z',
    comments: [
      {
        created_at: '2025-09-24T11:36:37.936Z',
        message:
          '## Prebuilt Rule Matching Summary\nThe Splunk rule "Access - Excessive Failed Logins - Rule" detects excessive failed login attempts.',
        created_by: 'assistant',
      },
    ],
    translation_result: 'full',
    elastic_rule: {
      severity: 'medium',
      prebuilt_rule_id: 'f9790abf-bd0c-45f9-8b5f-d0b74015e029',
      risk_score: 47,
      description:
        'Identifies multiple consecutive logon failures targeting an Admin account from the same source address and within a short time interval.',
      title: 'Privileged Account Brute Force',
      integration_ids: ['system', 'windows'],
    },
    ...overrides,
  };
};
