/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '../../../../../common/search_strategy';

/**
 * Mock the document result of the search for an alert
 */
export const mockSearchHit: SearchHit = {
  _index: 'index',
  _id: 'id',
  fields: {
    'kibana.alert.rule.parameters': [
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
