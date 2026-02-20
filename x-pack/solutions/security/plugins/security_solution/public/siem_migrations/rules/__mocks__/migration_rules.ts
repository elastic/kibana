/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationStatus } from '../../../../common/siem_migrations/constants';
import type { RuleMigrationRule } from '../../../../common/siem_migrations/model/rule_migration.gen';

export const migrationRules: RuleMigrationRule[] = [
  {
    id: '1',
    migration_id: 'test-migration-1',
    original_rule: {
      id: 'splunk-1',
      vendor: 'splunk',
      title: 'Network - Substantial Increase in Port Activity (By Destination) - Rule',
      description:
        'Alerts when a statistically significant increase in events on a given port is observed.',
      query: '| tstats `summariesonly` count as dest_port_traffic_count',
      query_language: 'spl',
      annotations: {
        mitre_attack: ['T1030'],
      },
    },
    '@timestamp': '2025-10-04T21:44:11.569Z',
    status: SiemMigrationStatus.COMPLETED,
    created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_at: '2025-10-04T21:49:06.827Z',
    comments: [
      {
        created_at: '2025-10-04T21:49:06.672Z',
        message: '## Prebuilt Rule Matching Summary',
        created_by: 'assistant',
      },
    ],
    translation_result: 'full',
    elastic_rule: {
      severity: 'low',
      prebuilt_rule_id: 'b240bfb8-26b7-4e5e-924e-218144a3fa71',
      risk_score: 21,
      description: 'A machine learning job detected an unusually large spike in network traffic.',
      title: 'Spike in Network Traffic',
      integration_ids: ['endpoint', 'network_traffic'],
    },
  },
  {
    id: '2',
    migration_id: 'test-migration-1',
    original_rule: {
      id: 'splunk-2',
      vendor: 'splunk',
      title: 'Audit - Anomalous Audit Trail Activity Detected - Rule',
      description: 'Discovers anomalous activity such as the deletion of or clearing of log files.',
      query:
        '| from datamodel:"Change"."Auditing_Changes" | where (\'action\'="cleared" OR \'action\'="stopped")',
      query_language: 'spl',
      annotations: {
        mitre_attack: ['T1070', 'T1089', 'T1066', 'T1054'],
      },
    },
    '@timestamp': '2025-10-04T21:44:09.940Z',
    status: SiemMigrationStatus.FAILED,
    created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_at: '2025-10-04T21:46:38.871Z',
    comments: [
      {
        created_at: '2025-10-04T21:46:38.871Z',
        message:
          'Error migrating document: Bad control character in string literal in JSON at position 88 (line 3 column 48)',
        created_by: 'assistant',
      },
    ],
  },
];
