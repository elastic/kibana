/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Hunt } from '../types';

export const hunts: Hunt[] = [
  {
    name: 'Outbound Connection Blocked to External IP',
    language: 'kuery',
    query: 'event.action: "outbound_blocked"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0011',
        tacticName: 'Command and Control',
        technique: 'T1071',
        techniqueName: 'Application Layer Protocol',
      },
    ],
  },
  {
    name: 'DNS Resolution to Suspicious IP',
    language: 'kuery',
    query: 'event.action: "dns_suspicious"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0011',
        tacticName: 'Command and Control',
        technique: 'T1071.004',
        techniqueName: 'DNS',
      },
    ],
  },
  {
    name: 'Lateral Movement via Internal Connection',
    language: 'kuery',
    query: 'event.action: "lateral_movement"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0008',
        tacticName: 'Lateral Movement',
        technique: 'T1021',
        techniqueName: 'Remote Services',
      },
    ],
  },
  {
    name: 'Outbound Connection via NAT Evasion',
    language: 'kuery',
    query: 'event.action: "nat_evasion"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0005',
        tacticName: 'Defense Evasion',
        technique: 'T1090',
        techniqueName: 'Proxy',
      },
    ],
  },
];
