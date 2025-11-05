/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatHuntingHypothesis } from '../types';

export const HYPOTHESES_VERSION = 1;

// Co-Pilot generated this example so far. More definitions can be added following this structure.
export const hypothesisDefinitions: ThreatHuntingHypothesis[] = [
  {
    title: 'Suspicious PowerShell Activity',
    summary:
      'Detects potentially malicious PowerShell activity that may indicate an attacker is using PowerShell for reconnaissance or lateral movement within the network.',
    managed: true,
    sourceType: 'pre_built',
    version: HYPOTHESES_VERSION,
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: [
          {
            id: 'TA0007',
            name: 'Lateral Movement',
            reference: 'https://attack.mitre.org/tactics/TA0007/',
          },
        ],
        technique: [
          {
            id: 'T1086',
            name: 'PowerShell',
            reference: 'https://attack.mitre.org/techniques/T1086/',
          },
        ],
      },
    ],
    tags: ['powerhell', 'lateral_movement', 'reconnaissance'],
    _meta: {
      mappingsVersion: 1,
    },
  },
  // Additional hypothesis definitions can be added here
];
