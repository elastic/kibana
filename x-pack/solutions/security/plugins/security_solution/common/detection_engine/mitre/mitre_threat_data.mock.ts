/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * These fixtures are hand-maintained. Every id must exist in the bundled MITRE artifact
 * served by the `mitre_attack` plugin. The entries were chosen to cover specific relational
 * cases that the Cypress coverage overview and rule fixtures depend on:
 *
 *   - Four distinct tactic/technique/subtechnique triples for enabled/disabled prebuilt and
 *     custom rules.
 *   - A technique (T1546 Event Triggered Execution) that maps to two tactics (TA0004
 *     Privilege Escalation and TA0003 Persistence) to exercise duplicate-technique handling
 *     across tactic columns.
 *
 * The co-located test checks every id against the bundled artifact, so a MITRE version bump that removes or renames one of these entities fails fast in Jest.
 */

export interface MockThreatTactic {
  name: string;
  id: string;
  reference: string;
}

export interface MockThreatTechnique extends MockThreatTactic {
  tactics: string[];
}

export interface MockThreatSubtechnique extends MockThreatTechnique {
  techniqueId: string;
}

export interface MockThreatData {
  tactic: MockThreatTactic;
  technique: MockThreatTechnique;
  subtechnique: MockThreatSubtechnique;
}

export interface MockDuplicateTechniqueThreatData {
  tactic: MockThreatTactic;
  technique: MockThreatTechnique;
}

/**
 * An array of full Mitre Attack Threat objects that are kept in sync with the bundled MITRE artifact
 *
 * Is built alongside and sampled from the data in the file so to always be valid with the most up to date MITRE ATT&CK data
 */
export const getMockThreatData = (): MockThreatData[] => [
  {
    tactic: {
      name: 'Credential Access',
      id: 'TA0006',
      reference: 'https://attack.mitre.org/tactics/TA0006/',
    },
    technique: {
      name: 'OS Credential Dumping',
      id: 'T1003',
      reference: 'https://attack.mitre.org/techniques/T1003/',
      tactics: ['credential-access'],
    },
    subtechnique: {
      name: '/etc/passwd and /etc/shadow',
      id: 'T1003.008',
      reference: 'https://attack.mitre.org/techniques/T1003/008/',
      tactics: ['credential-access'],
      techniqueId: 'T1003',
    },
  },
  {
    tactic: {
      name: 'Defense Impairment',
      id: 'TA0112',
      reference: 'https://attack.mitre.org/tactics/TA0112/',
    },
    technique: {
      name: 'Disable or Modify Tools',
      id: 'T1685',
      reference: 'https://attack.mitre.org/techniques/T1685/',
      tactics: ['defense-impairment'],
    },
    subtechnique: {
      name: 'Clear Linux or Mac System Logs',
      id: 'T1685.006',
      reference: 'https://attack.mitre.org/techniques/T1685/006/',
      tactics: ['defense-impairment'],
      techniqueId: 'T1685',
    },
  },
  {
    tactic: {
      name: 'Credential Access',
      id: 'TA0006',
      reference: 'https://attack.mitre.org/tactics/TA0006/',
    },
    technique: {
      name: 'Credentials from Password Stores',
      id: 'T1555',
      reference: 'https://attack.mitre.org/techniques/T1555/',
      tactics: ['credential-access'],
    },
    subtechnique: {
      name: 'Credentials from Web Browsers',
      id: 'T1555.003',
      reference: 'https://attack.mitre.org/techniques/T1555/003/',
      tactics: ['credential-access'],
      techniqueId: 'T1555',
    },
  },
  {
    tactic: {
      name: 'Privilege Escalation',
      id: 'TA0004',
      reference: 'https://attack.mitre.org/tactics/TA0004/',
    },
    technique: {
      name: 'Abuse Elevation Control Mechanism',
      id: 'T1548',
      reference: 'https://attack.mitre.org/techniques/T1548/',
      tactics: ['privilege-escalation'],
    },
    subtechnique: {
      name: 'Elevated Execution with Prompt',
      id: 'T1548.004',
      reference: 'https://attack.mitre.org/techniques/T1548/004/',
      tactics: ['privilege-escalation'],
      techniqueId: 'T1548',
    },
  },
];

/**
 * An array of specifically chosen Mitre Attack Threat objects that are kept in sync with the bundled MITRE artifact
 *
 * These objects have identical technique fields but are assigned to different tactics
 */
export const getDuplicateTechniqueThreatData = (): MockDuplicateTechniqueThreatData[] => [
  {
    tactic: {
      name: 'Privilege Escalation',
      id: 'TA0004',
      reference: 'https://attack.mitre.org/tactics/TA0004/',
    },
    technique: {
      name: 'Event Triggered Execution',
      id: 'T1546',
      reference: 'https://attack.mitre.org/techniques/T1546/',
      tactics: ['privilege-escalation', 'persistence'],
    },
  },
  {
    tactic: {
      name: 'Persistence',
      id: 'TA0003',
      reference: 'https://attack.mitre.org/tactics/TA0003/',
    },
    technique: {
      name: 'Event Triggered Execution',
      id: 'T1546',
      reference: 'https://attack.mitre.org/techniques/T1546/',
      tactics: ['privilege-escalation', 'persistence'],
    },
  },
];
