/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { getUnusualLoginUserIpsJobName } from '../../../../../common/entity_analytics/privmon';
import type { RuleCreateProps } from '../../../../../common/api/detection_engine';
import type { IDetectionRulesClient } from '../../../detection_engine/rule_management/logic/detection_rules_client/detection_rules_client_interface';

const getRules = (namespace: string): RuleCreateProps[] => [
  {
    name: 'Login From An Unusual Number of Different IPs',
    tags: [
      'Use Case: Identity and Access Audit',
      'Use Case: Threat Detection',
      'Rule Type: ML',
      'Rule Type: Machine Learning',
      'Tactic: Credential Access',
      'Privileged User Monitoring',
    ],
    interval: '1m',
    enabled: true,
    description:
      'Identifies an unusually high number of authentication attempts from different IPs for a user.',
    risk_score: 60,
    severity: 'high',
    output_index: '',
    author: ['Elastic'],
    from: 'now-45m',
    rule_id: '4330272b-9724-4bc6-a3ca-f1532b81e5c2',
    max_signals: 100,
    risk_score_mapping: [],
    severity_mapping: [],
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0006',
          name: 'Credential Access',
          reference: 'https://attack.mitre.org/tactics/TA0006/',
        },
        technique: [
          {
            id: 'T1110',
            name: 'Brute Force',
            reference: 'https://attack.mitre.org/techniques/T1110/',
          },
        ],
      },
    ],
    to: 'now',
    version: 1,
    exceptions_list: [],
    related_integrations: [
      {
        package: 'auditd_manager',
        version: '^1.0.0',
      },
      {
        package: 'endpoint',
        version: '^8.2.0',
      },
      {
        package: 'system',
        version: '^1.6.4',
      },
    ],
    required_fields: [],
    setup: '',
    type: 'machine_learning',
    anomaly_threshold: 40,
    machine_learning_job_id: [getUnusualLoginUserIpsJobName(namespace)],
    actions: [],
  },
];

export const createPrivmonDetectionRules = async (opts: {
  detectionRulesClient: IDetectionRulesClient;
  logger: Logger;
  namespace: string;
}): Promise<void> => {
  const { detectionRulesClient, logger, namespace } = opts;

  for (const rule of getRules(namespace)) {
    try {
      await detectionRulesClient.createCustomRule({ params: rule });
    } catch (err) {
      logger.error(`Failed to create rule: ${rule.name}`);
      logger.error(err);
    }
  }
};
