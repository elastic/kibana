/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOSE_ATTACK_ACTION_WORKFLOW_ID } from '../constants';
import type { ForensicsSummaryInputs } from '../types';

/** A confirmed incident on one host with every part of the card present. */
export const fixtureInputs: ForensicsSummaryInputs = {
  verdict: 'confirmed_incident',
  autonomy: 'manual',
  analyzedAt: '2026-11-02T10:15:00.000Z',
  summary:
    'Ransomware staged on win-fin-07 after a phishing attachment ran PowerShell; credentials were dumped and two shares were encrypted.',
  attack: {
    title: 'Ransomware on {{ host.name win-fin-07 }}',
    tactics: ['Initial Access', 'Execution', 'Credential Access', 'Impact'],
    alertIds: ['a1', 'a2', 'a3'],
  },
  timeline: {
    window: { start: '2026-11-02T08:00:00Z', end: '2026-11-02T10:00:00Z' },
    events: [
      {
        timestamp: '2026-11-02T08:12:03Z',
        host: 'win-fin-07',
        description: 'outlook.exe spawned powershell.exe -enc JABzAD0A… as FIN\\jdoe',
      },
      {
        timestamp: '2026-11-02T08:14:40Z',
        host: 'win-fin-07',
        description: 'rundll32.exe loaded comsvcs.dll MiniDump against lsass.exe (pid 712)',
      },
    ],
  },
  iocs: {
    affected_hosts: [{ value: 'win-fin-07' }],
    compromised_identities: [{ value: 'FIN\\jdoe' }],
    ips: [{ value: '203.0.113.7' }, { value: '198.51.100.20' }],
    shas: [
      { value: 'a'.repeat(64) },
      { value: 'b'.repeat(64) },
      { value: 'c'.repeat(64) },
      { value: 'd'.repeat(64) },
    ],
  },
  proposals: [
    {
      title: 'Close the attack and its 3 alerts',
      status: 'pending',
      category: 'respond',
      impact: 'medium',
      confidence: 'high',
      expiresAt: '2026-11-03T10:15:00.000Z',
      actionWorkflowId: CLOSE_ATTACK_ACTION_WORKFLOW_ID,
    },
    {
      title: 'Isolate win-fin-07',
      status: 'succeeded',
      category: 'respond',
      impact: 'high',
      confidence: 'high',
    },
    {
      title: 'Kill process 4242 on win-fin-07',
      status: 'expired',
      category: 'respond',
      impact: 'medium',
      confidence: 'medium',
    },
  ],
  alerts: [
    { ruleName: 'Suspicious PowerShell', severity: 'high', riskScore: 73 },
    { ruleName: 'LSASS memory dump', severity: 'critical', riskScore: 99 },
    { ruleName: 'Ransomware behavior', severity: 'critical', riskScore: 95 },
  ],
};
