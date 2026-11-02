/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_UUID,
  ALERT_URL,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { SearchHit } from '../../../../../common/search_strategy';

/**
 * Mock the document result of the search for an alert
 */
export const mockSearchHit: SearchHit = {
  _index: 'index',
  _id: 'id',
  fields: {
    [ALERT_RULE_UUID]: ['ruleId'],
    [ALERT_RULE_NAME]: ['ruleName'],
    [ALERT_RULE_DESCRIPTION]: ['ruleDescription'],
    [TIMESTAMP]: ['2020-01-01T00:00:00.000Z'],
    'host.name': ['hostName'],
    'user.name': ['userName'],
    'agent.id': ['agentId'],
    [ALERT_URL]: ['alertUrl'],
    [ALERT_REASON]: ['reason'],
    [ALERT_RULE_PARAMETERS]: [
      {
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: '123',
              reference: 'https://attack.mitre.org/tactics/123',
              name: 'Tactic',
            },
            technique: [
              {
                id: '456',
                reference: 'https://attack.mitre.org/techniques/456',
                name: 'Technique',
              },
            ],
          },
        ],
      },
    ],
  },
};
