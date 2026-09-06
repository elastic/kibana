/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorroborationScenario } from './types';

export const SCENARIOS: CorroborationScenario[] = [
  {
    id: 'full-corroboration',
    name: 'Full corroboration',
    description: 'All narrative stages have matching raw telemetry',
    narrative:
      'Phishing email delivered to WKSTN-EVAL01, PowerShell download cradle executed, C2 beacon established to 192.168.1.50:443',
    alertIds: ['alert-001', 'alert-002'],
    scope: {
      hosts: ['WKSTN-EVAL01'],
      timeRange: { from: '2026-08-18T10:00:00Z', to: '2026-08-18T12:00:00Z' },
    },
    expected: {
      corroboratedCount: 3,
      gapCount: 0,
      minConfidence: 0.7,
    },
  },
  {
    id: 'partial-gap',
    name: 'Partial gap',
    description: 'One stage has no raw telemetry (detection blind spot)',
    narrative:
      'Phishing email delivered, PowerShell executed, lateral movement to SRV-DC01 via WMI, C2 beacon from SRV-DC01',
    alertIds: ['alert-003', 'alert-004'],
    scope: {
      hosts: ['WKSTN-EVAL01', 'SRV-DC01'],
      timeRange: { from: '2026-08-18T10:00:00Z', to: '2026-08-18T14:00:00Z' },
    },
    expected: {
      corroboratedCount: 3,
      gapCount: 1,
      minConfidence: 0.4,
    },
  },
  {
    id: 'no-raw-telemetry',
    name: 'No raw telemetry',
    description: 'The entire narrative cannot be corroborated from raw logs',
    narrative: 'Suspected data exfiltration via DNS tunneling from WKSTN-EVAL01',
    alertIds: ['alert-005'],
    scope: {
      hosts: ['WKSTN-EVAL01'],
      timeRange: { from: '2026-08-18T10:00:00Z', to: '2026-08-18T12:00:00Z' },
    },
    expected: {
      corroboratedCount: 0,
      gapCount: 1,
      minConfidence: 0.0,
    },
  },
];
