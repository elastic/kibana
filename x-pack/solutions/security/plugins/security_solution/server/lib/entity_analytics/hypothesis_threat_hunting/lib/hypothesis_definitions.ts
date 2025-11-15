/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatHuntingHypothesis } from '../types';

export const HYPOTHESES_VERSION = 1;

// Co-Pilot generated this example so far. More definitions can be added following this structure.
export const getHypothesisDefinitions = (
  version = HYPOTHESES_VERSION
): ThreatHuntingHypothesis[] => [
  {
    title: 'UPDATED SUSPICIOUS POWERSHELL ACTIVITY UPDATE',
    hypothesisId: 'suspicious_powershell_activity_v1',
    summary:
      'Detects potentially malicious PowerShell activity that may indicate an attacker is using PowerShell for reconnaissance or lateral movement within the network.',
    managed: true,
    sourceType: 'pre_built',
    version, // should use HYPOTHESES_VERSION
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
    tags: ['powershell', 'lateral_movement', 'reconnaissance'],
  },
  {
    title: 'UPDATED SUSPICIOUS POWERSHELL ACTIVITY V2 UPDATE',
    hypothesisId: 'suspicious_powershell_activity_v3',
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
    tags: ['powershell', 'lateral_movement', 'reconnaissance'],
  },
  // Additional hypothesis definitions can be added here
];

const randomTag = (allTags: string[]) => allTags[Math.floor(Math.random() * allTags.length)];

export const hypothesisDefinitionsScaled: ThreatHuntingHypothesis[] = Array.from(
  { length: 25000 },
  (_, i) => ({
    ...getHypothesisDefinitions(HYPOTHESES_VERSION)[0],
    title: `${getHypothesisDefinitions(HYPOTHESES_VERSION)[0].title} #${i + 1}`,
    id: `hypothesis-${i + 1}`,
    tags: [randomTag(getHypothesisDefinitions(HYPOTHESES_VERSION)[0].tags || []), `auto_${i + 1}`],
  })
);
