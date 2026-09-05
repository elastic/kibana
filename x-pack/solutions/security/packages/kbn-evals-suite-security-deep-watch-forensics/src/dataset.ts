/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ForensicExample } from './types';

/**
 * Golden forensic scenarios for the Deep Watch leaf-quality scorecard.
 *
 * Each example pairs a realistic escalation context with expected forensic
 * findings. The suite drives the REAL `deep-watch-forensics` skill via
 * Agent Builder converse per example and scores the draft report against
 * these expectations.
 *
 * Labels are conservative: every assertion is something a competent
 * specialist would expect from a draft forensic report.
 */
export const forensicDataset: ForensicExample[] = [
  {
    id: 'dwf-apt29-lateral-movement',
    input: {
      escalation_context:
        'Dark Watch escalated APT29 threat report. C2 IP 185.220.101.42 observed on ' +
        'host DESKTOP-APT29 (Watch Floor alert ALERT-APT29-001). SHA-256 ' +
        'a3f5c9d1b2e8f7a4c6d0e1b3f5a7c9d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b2 found ' +
        'in process telemetry. Registry modification HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run ' +
        'observed. Investigate patient zero, lateral movement, and persistence.',
      hosts: ['DESKTOP-APT29', 'SERVER-DC01'],
      time_window_hours: 72,
      iocs: [
        { type: 'network_destination', value: '185.220.101.42' },
        {
          type: 'file_hash',
          value: 'a3f5c9d1b2e8f7a4c6d0e1b3f5a7c9d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b2',
        },
        { type: 'registry_key', value: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' },
      ],
      mitre_techniques: ['T1078', 'T1570', 'T1547'],
    },
    output: {
      minTimelineEvents: 1,
      expectedIocs: [
        { type: 'network_destination', value: '185.220.101.42', status: 'confirmed' },
        {
          type: 'file_hash',
          value: 'a3f5c9d1b2e8f7a4c6d0e1b3f5a7c9d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b2',
          status: 'not_found',
        },
        {
          type: 'registry_key',
          value: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
          status: 'unable_to_validate',
        },
      ],
      minUnresolvedQuestions: 1,
      draftLabelRequired: true,
      noExecutionRequired: true,
    },
  },
  {
    id: 'dwf-rundll32-persistence',
    input: {
      escalation_context:
        'Watch Floor escalated Significant Security Event. Host WEB-SERVER-01 ' +
        'shows rundll32.exe spawning suspicious DLL in temp directory. ' +
        'Registry run key HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\FlashUpdateSvc created. ' +
        'Network beacon to 192.168.1.100 on port 4444 detected. Draft forensic ' +
        'report required. No response actions authorized.',
      hosts: ['WEB-SERVER-01'],
      time_window_hours: 24,
      iocs: [
        { type: 'network_destination', value: '192.168.1.100' },
        {
          type: 'registry_key',
          value: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\FlashUpdateSvc',
        },
        { type: 'process_name', value: 'rundll32.exe' },
      ],
      mitre_techniques: ['T1218', 'T1547'],
    },
    output: {
      minTimelineEvents: 1,
      expectedIocs: [
        { type: 'network_destination', value: '192.168.1.100', status: 'confirmed' },
        {
          type: 'registry_key',
          value: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\FlashUpdateSvc',
          status: 'unable_to_validate',
        },
        { type: 'process_name', value: 'rundll32.exe', status: 'unable_to_validate' },
      ],
      minUnresolvedQuestions: 1,
      draftLabelRequired: true,
      noExecutionRequired: true,
    },
  },
  {
    id: 'dwf-supply-chain-initial-access',
    input: {
      escalation_context:
        'Attack Discovery identified legitimate npm package @trusted/build-utils ' +
        'containing obfuscated post-install script establishing C2 to 203.0.113.77. ' +
        'Dev workstation DEV-WKS-07 compromised. Hash d2a5b8e1c4f7a9b3d6e0f2c5a8b1d4e7 ' +
        'matched in file events. Registry modification evidence of persistence. ' +
        'Require full forensic timeline and IoC validation.',
      hosts: ['DEV-WKS-07'],
      time_window_hours: 48,
      iocs: [
        { type: 'network_destination', value: '203.0.113.77' },
        { type: 'file_hash', value: 'd2a5b8e1c4f7a9b3d6e0f2c5a8b1d4e7' },
        { type: 'registry_key', value: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' },
      ],
      mitre_techniques: ['T1195', 'T1071'],
    },
    output: {
      minTimelineEvents: 1,
      expectedIocs: [
        { type: 'network_destination', value: '203.0.113.77', status: 'not_found' },
        { type: 'file_hash', value: 'd2a5b8e1c4f7a9b3d6e0f2c5a8b1d4e7', status: 'not_found' },
        {
          type: 'registry_key',
          value: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
          status: 'unable_to_validate',
        },
      ],
      minUnresolvedQuestions: 1,
      draftLabelRequired: true,
      noExecutionRequired: true,
    },
  },
];

/** Convenience export for specs. */
export const FORENSIC_CASES = forensicDataset;
