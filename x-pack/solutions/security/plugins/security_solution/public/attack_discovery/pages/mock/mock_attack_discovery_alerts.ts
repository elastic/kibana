/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

export const getMockAttackDiscoveryAlerts = (): AttackDiscoveryAlert[] => [
  {
    alertIds: [
      'f31a96abb64168ce92bab7369b5ce3c96bcea72707b58f96d85d81204b77c000',
      '5973618596d3a91e8de1eccfc49334160ca5ac14b09f33a4fa7184ab0b9a1e4f',
      'c616b1b2c93d83def20e44332d8fb6b291115240cabc2312f5110c36918460c3',
      'b69530d0ddba29ee2a9c520a7d63f99d4a63a38f403649010443be929a03b880',
      'f2a83f9accb55a89536f055936c798e61b9ead62fb50addcc7d52a2e5be4673f',
      'ee618109acb623be3ea24bf6a870984c95e63ec130876dc5ab34fbc7e0643fcb',
    ],
    alertRuleUuid: 'attack_discovery_ad_hoc_rule_id',
    alertWorkflowStatus: 'open',
    connectorId: 'gpt4oAzureDemo3',
    connectorName: 'GPT-4o',
    detailsMarkdown:
      'The attack began with the execution of {{ process.name My Go Application.app }} on {{ host.name 3d241119-f77a-454e-8ee3-d36e05a8714f }}. The malware file {{ file.name unix1 }} was detected at {{ file.path /Users/james/unix1 }}. The process {{ process.command_line /private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app }} failed code signature verification, indicating potential tampering. Subsequently, {{ process.name chmod }} was executed to modify permissions on {{ file.path /Users/james/unix1 }}, enabling further malicious activity. The attacker leveraged {{ user.name 325761dd-b22b-4fdc-8444-a4ef66d76380 }} to execute commands and escalate privileges. Following this, the attacker utilized {{ process.name unix1 }} to access sensitive files, including {{ file.path /Users/james/library/Keychains/login.keychain-db }}. The process {{ process.command_line /Users/james/unix1 /Users/james/library/Keychains/login.keychain-db TempTemp1234!! }} indicates credential theft attempts. The attacker leveraged {{ user.name 325761dd-b22b-4fdc-8444-a4ef66d76380 }} to exfiltrate data, completing the attack chain.',
    entitySummaryMarkdown:
      'Malware and credential theft detected on {{ host.name 3d241119-f77a-454e-8ee3-d36e05a8714f }} by {{ user.name 325761dd-b22b-4fdc-8444-a4ef66d76380 }}.',
    generationUuid: 'bc8fc876-1f25-437e-8084-284cc52fd606',
    id: '0b8cf9c7-5ba1-49ce-b53d-3cfb06918b60',
    mitreAttackTactics: [
      'Execution',
      'Persistence',
      'Privilege Escalation',
      'Credential Access',
      'Exfiltration',
    ],
    replacements: {
      '325761dd-b22b-4fdc-8444-a4ef66d76380': 'james',
      '3d241119-f77a-454e-8ee3-d36e05a8714f': 'SRVMAC08',
      '914c4f07-1f28-41b0-ad77-af135c2ef7ce': 'root',
      'ed57c0c6-ee92-4212-82fa-6cd4bab9a550': 'Administrator',
      'b5dd21c9-fd63-4abd-bf9e-2d8782085214': 'SRVWIN07',
      '76c5e5d9-9664-406e-8fb3-80dba1ca2922': 'SRVWIN06',
      'f5cebfc5-e714-4fd8-95c9-30ed9dd5f606': 'SRVNIX05',
      '6e5ede8f-51d0-4887-b840-68eec5ecb8af': 'SRVWIN04',
      '5236bb7f-719d-4044-b09a-c4f395fd03de': 'SRVWIN03',
      'de48665d-beb0-4dc2-90ef-68db692527ed': 'SRVWIN02',
      '85ef4dd0-2a0a-47b7-ac8f-ed6801b3dd7d': 'SRVWIN01',
    },
    riskScore: 594,
    summaryMarkdown:
      'Malware and credential theft detected on {{ host.name 3d241119-f77a-454e-8ee3-d36e05a8714f }}.',
    timestamp: '2025-05-05T17:36:50.533Z',
    title: 'Unix1 Malware and Credential Theft',
    userId: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    userName: 'elastic',
    users: [
      {
        id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
        name: 'elastic',
      },
    ],
  },
  {
    alertIds: [
      'da007cbe9ed0771f73decb76e5e19320a67f0f43e0e6c7b0746c3abeffbd15e2',
      '831ee46f97a384d65ca927b93391af3e81106064327fe84ee742fb9680cfa115',
      'b2526dee225a66361446ed4b18477d73f48586a1c0e33eeab926d8c79cd49b88',
    ],
    alertRuleUuid: 'attack_discovery_ad_hoc_rule_id',
    alertWorkflowStatus: 'open',
    connectorId: 'gpt4oAzureDemo3',
    connectorName: 'GPT-4o',
    detailsMarkdown:
      'The attacker leveraged {{ process.name wscript.exe }} to execute malicious scripts, including {{ file.name AppPool.vbs }} on {{ host.name b5dd21c9-fd63-4abd-bf9e-2d8782085214 }}. The script was spawned by {{ process.parent.name WINWORD.EXE }} and executed commands to establish persistence and command-and-control channels. The attacker utilized {{ user.name ed57c0c6-ee92-4212-82fa-6cd4bab9a550 }} to escalate privileges and maintain access.',
    entitySummaryMarkdown:
      'Malicious script execution detected on {{ host.name b5dd21c9-fd63-4abd-bf9e-2d8782085214 }} by {{ user.name ed57c0c6-ee92-4212-82fa-6cd4bab9a550 }}.',
    generationUuid: 'bc8fc876-1f25-437e-8084-284cc52fd606',
    id: 'b8a1be79-54af-4c1e-a71e-291a7b93b769',
    mitreAttackTactics: ['Initial Access', 'Execution', 'Persistence'],
    replacements: {
      '325761dd-b22b-4fdc-8444-a4ef66d76380': 'james',
      '3d241119-f77a-454e-8ee3-d36e05a8714f': 'SRVMAC08',
      '914c4f07-1f28-41b0-ad77-af135c2ef7ce': 'root',
      'ed57c0c6-ee92-4212-82fa-6cd4bab9a550': 'Administrator',
      'b5dd21c9-fd63-4abd-bf9e-2d8782085214': 'SRVWIN07',
      '76c5e5d9-9664-406e-8fb3-80dba1ca2922': 'SRVWIN06',
      'f5cebfc5-e714-4fd8-95c9-30ed9dd5f606': 'SRVNIX05',
      '6e5ede8f-51d0-4887-b840-68eec5ecb8af': 'SRVWIN04',
      '5236bb7f-719d-4044-b09a-c4f395fd03de': 'SRVWIN03',
      'de48665d-beb0-4dc2-90ef-68db692527ed': 'SRVWIN02',
      '85ef4dd0-2a0a-47b7-ac8f-ed6801b3dd7d': 'SRVWIN01',
    },
    riskScore: 297,
    summaryMarkdown:
      'Malicious script execution detected on {{ host.name b5dd21c9-fd63-4abd-bf9e-2d8782085214 }}.',
    timestamp: '2025-05-05T17:36:50.533Z',
    title: 'Script Execution via Wscript',
    userId: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    userName: 'elastic',
    users: [
      {
        id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
        name: 'elastic',
      },
    ],
  },
];
