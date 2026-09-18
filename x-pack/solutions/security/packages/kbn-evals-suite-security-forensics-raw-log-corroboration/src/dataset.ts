/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorroborationScenario } from './types';

/**
 * Scenarios for the raw-log corroboration suite.
 *
 * `stages` is the ground truth the fixture is seeded from and `expected` is what
 * the report is checked against. `dataset_invariants.test.ts` asserts the two
 * agree, so a stage edit that is not reflected in the bounds fails locally
 * instead of silently changing what the eval measures.
 *
 * Every scenario is isolated on BOTH scope axes the prompt gives the agent —
 * hosts and time window — because all scenarios are seeded into the same
 * `logs-*` indices before any of them runs:
 *
 *   - no host appears in two scenarios' `scope.hosts`;
 *   - the `timeRange` windows are pairwise disjoint.
 *
 * Without that, a scenario whose premise is "there is no telemetry for this
 * host" was answered from a sibling scenario's documents: `no-raw-telemetry`
 * used the same `WKSTN-EVAL01` host and the same window as
 * `full-corroboration`, so the empty-dataset case could never be empty.
 * `dataset_invariants.test.ts` pins both properties.
 */
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
    stages: [
      {
        id: 'initial-access',
        evidence: 'outlook.exe spawned powershell.exe on WKSTN-EVAL01',
        corroborated: true,
      },
      {
        id: 'execution',
        evidence: 'powershell -enc download cradle on WKSTN-EVAL01',
        corroborated: true,
      },
      {
        id: 'command-and-control',
        evidence: 'tcp connection to 192.168.1.50:443 from WKSTN-EVAL01',
        corroborated: true,
      },
    ],
    expected: {
      minCorroboratedCount: 3,
      maxCorroboratedCount: 3,
      minGapCount: 0,
      maxGapCount: 0,
      minConfidence: 0.5,
    },
  },
  {
    id: 'partial-gap',
    name: 'Partial gap',
    description: 'One stage has no raw telemetry (detection blind spot)',
    narrative:
      'Phishing email delivered to WKSTN-EVAL02, PowerShell executed, lateral movement to SRV-DC01 via WMI, C2 beacon from SRV-DC01',
    alertIds: ['alert-003', 'alert-004'],
    scope: {
      hosts: ['WKSTN-EVAL02', 'SRV-DC01'],
      timeRange: { from: '2026-08-19T10:00:00Z', to: '2026-08-19T14:00:00Z' },
    },
    stages: [
      {
        id: 'initial-access',
        evidence: 'outlook.exe spawned powershell.exe on WKSTN-EVAL02',
        corroborated: true,
      },
      {
        id: 'execution',
        evidence: 'powershell -enc download cradle on WKSTN-EVAL02',
        corroborated: true,
      },
      {
        id: 'lateral-movement',
        evidence: 'WMI connection from WKSTN-EVAL02 to SRV-DC01',
        corroborated: false,
      },
      {
        id: 'command-and-control',
        evidence: 'tcp connection to 192.168.1.50:443 from SRV-DC01',
        corroborated: true,
      },
    ],
    expected: {
      minCorroboratedCount: 3,
      maxCorroboratedCount: 3,
      minGapCount: 1,
      maxGapCount: 1,
      minConfidence: 0.5,
    },
  },
  {
    id: 'no-raw-telemetry',
    name: 'No raw telemetry',
    description: 'The entire narrative cannot be corroborated from raw logs',
    narrative: 'Suspected data exfiltration via DNS tunneling from WKSTN-EVAL03',
    alertIds: ['alert-005'],
    scope: {
      hosts: ['WKSTN-EVAL03'],
      timeRange: { from: '2026-08-20T10:00:00Z', to: '2026-08-20T12:00:00Z' },
    },
    stages: [
      {
        id: 'exfiltration',
        evidence: 'DNS tunneling telemetry for WKSTN-EVAL03',
        corroborated: false,
      },
    ],
    expected: {
      minCorroboratedCount: 0,
      maxCorroboratedCount: 0,
      minGapCount: 1,
      maxGapCount: 1,
      minConfidence: 0.5,
    },
  },
  {
    id: 'decoy-out-of-scope',
    name: 'Decoy telemetry outside scope',
    description:
      'Matching telemetry exists but belongs to another host and sits outside the scenario time range, so nothing in scope corroborates the narrative',
    narrative:
      'PowerShell download cradle executed on WKSTN-EVAL04, C2 beacon established to 192.168.1.50:443',
    alertIds: ['alert-006'],
    scope: {
      hosts: ['WKSTN-EVAL04'],
      timeRange: { from: '2026-08-21T10:00:00Z', to: '2026-08-21T12:00:00Z' },
    },
    // Both stages have matching telemetry in the index, but on DECOY-HOST-01 and
    // timestamped a day earlier. A report that counts these as corroboration is
    // wrong on both scope dimensions; a report that flags them as gaps is right.
    // This is the case that separates a model reading the scope from one
    // matching keywords.
    stages: [
      {
        id: 'execution',
        evidence: 'powershell download cradle (recorded on DECOY-HOST-01)',
        corroborated: false,
        decoy: { host: 'DECOY-HOST-01', outsideTime: true },
      },
      {
        id: 'command-and-control',
        evidence: 'C2 beacon to 192.168.1.50:443 (recorded on DECOY-HOST-01)',
        corroborated: false,
        decoy: { host: 'DECOY-HOST-01', outsideTime: true },
      },
    ],
    expected: {
      minCorroboratedCount: 0,
      maxCorroboratedCount: 0,
      minGapCount: 1,
      maxGapCount: 2,
      minConfidence: 0.5,
    },
  },
];
