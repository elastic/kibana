/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

export const mockAttackDiscoveries: AttackDiscovery[] = [
  {
    title: 'Critical Malware and Phishing Alerts on host e1cb3cf0-30f3-4f99-a9c8-518b955c6f90',
    alertIds: [
      '4af5689eb58c2420efc0f7fad53c5bf9b8b6797e516d6ea87d6044ce25d54e16',
      'c675d7eb6ee181d788b474117bae8d3ed4bdc2168605c330a93dd342534fb02b',
      '021b27d6bee0650a843be1d511119a3b5c7c8fdaeff922471ce0248ad27bd26c',
      '6cc8d5f0e1c2b6c75219b001858f1be64194a97334be7a1e3572f8cfe6bae608',
      'f39a4013ed9609584a8a22dca902e896aa5b24d2da03e0eaab5556608fa682ac',
      '909968e926e08a974c7df1613d98ebf1e2422afcb58e4e994beb47b063e85080',
      '2c25a4dc31cd1ec254c2b19ea663fd0b09a16e239caa1218b4598801fb330da6',
      '3bf907becb3a4f8e39a3b673e0d50fc954a7febef30c12891744c603760e4998',
    ],
    timestamp: '2024-10-10T22:59:52.749Z',
    detailsMarkdown:
      '- On `2023-06-19T00:28:38.061Z` a critical malware detection alert was triggered on host {{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }} running {{ host.os.name macOS }} version {{ host.os.version 13.4 }}.\n- The malware was identified as {{ file.name unix1 }} with SHA256 hash {{ file.hash.sha256 0b18d6880dc9670ab2b955914598c96fc3d0097dc40ea61157b8c79e75edf231 }}.\n- The process {{ process.name My Go Application.app }} was executed with command line {{ process.command_line /private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app }}.\n- The process was not trusted as its code signature failed to satisfy specified code requirements.\n- The user involved was {{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}.\n- Another critical alert was triggered for potential credentials phishing via {{ process.name osascript }} on the same host.\n- The phishing attempt involved displaying a dialog to capture the user\'s password.\n- The process {{ process.name osascript }} was executed with command line {{ process.command_line osascript -e display dialog "MacOS wants to access System Preferences\\n\\nPlease enter your password." with title "System Preferences" with icon file "System:Library:CoreServices:CoreTypes.bundle:Contents:Resources:ToolbarAdvanced.icns" default answer "" giving up after 30 with hidden answer ¬ }}.\n- The MITRE ATT&CK tactics involved include Credential Access and Input Capture.',
    summaryMarkdown:
      'Critical malware and phishing alerts detected on {{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }} involving user {{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}. Malware identified as {{ file.name unix1 }} and phishing attempt via {{ process.name osascript }}.',
    mitreAttackTactics: ['Credential Access', 'Input Capture'],
    entitySummaryMarkdown:
      'Critical malware and phishing alerts detected on {{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }} involving user {{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}.',
  },
  {
    alertIds: [
      '093abac9d2431f4e87e696aee648c44a77cc9d4e7d12ba90ad71821c399baffe',
      '57fbcbdc22ececf1cbc4d3978c8085b64e33f03f927997769353348d003b80ac',
      '5fb3aa96aa5db16a2b8f6f6dabc1b575c80325897839e4ed4fd1c4e264ce591f',
      '61666b168da4e77afb540a5c04b845c32d9e0113e1434f04f2e25b35980527a7',
      '65acae68c6f518871a70f139913a031d68275808d584731f049b24fd3690f67b',
      '87f2d1a10a41fd3ed6077cf85d96df744255fec1072834ca30d5a88525dc9c9d',
      '8b164dbdaff8b57b7b881d11ceecca8cab0364422d2bf87a009f4f897066cf23',
      'b1c21a113f3858b6fd0a2f3854b71f9da52bdf46fdfa2c702a3f966f8809e153',
      'b47c3d991f071dcae02d5de601c6ebdec565e31262ae6cd3a304f6373225c65b',
      'd7985a0a305644d27945ca0ffcb861c75f6144199d16e8ac9f681fcf26333308',
    ],
    detailsMarkdown:
      '- On {{ host.name 1f217ee0-af2d-424b-b733-b0fdd726df69 }}, a suspicious process {{ process.name mimikatz.exe }} with {{ process.args "C:\\mimikatz.exe",--tr1 }} was executed by {{ user.name a2b0848d-e54f-4cb2-83db-01186ad3a33c }} from {{ user.domain 7nabs9z95j }} at {{ kibana.alert.original_time 2025-06-10T11:27:41.520Z }}, resulting in authentication failures.\n- Shortly after, the same host saw file activity on {{ file.path C:\\My Documents\\business\\January\\processName }} by process {{ process.name lsass.exe }} ({{ process.args "C:\\lsass.exe",--1ge }}) under {{ user.name 24fcfb78-d478-485f-a811-863e7f455e84 }} from {{ user.domain qevk4kbvcm }} at {{ kibana.alert.original_time 2025-06-10T11:30:47.520Z }}.\n- At {{ kibana.alert.original_time 2025-06-10T12:10:20.520Z }}, on the same host, {{ process.name powershell.exe }} and {{ file.name fake_behavior.exe }} were executed by {{ user.name 054b9510-4e58-4a0a-bc28-0286a6566e19 }} from {{ user.domain aacuihaf3x }}, with network connections from {{ source.ip 10.234.158.79 }} to {{ destination.ip 10.66.11.163 }}.\n- Simultaneously, on {{ host.name e70b7f81-e5a1-4c83-9168-568156cdc17a }}, malware {{ process.name iexlorer.exe }} was detected as {{ user.name 1e30f444-04b7-43d0-9b97-1d335d96e72c }} from {{ user.domain cwi41t2i0r }} at {{ kibana.alert.original_time 2025-06-10T12:10:12.534Z }}, suggesting propagation.\n- At {{ kibana.alert.original_time 2025-06-10T12:13:06.520Z }}, on {{ host.name 1f217ee0-af2d-424b-b733-b0fdd726df69 }}, {{ process.name explorer.exe }} ({{ process.executable C:/fake_behavior/explorer.exe }}) and {{ file.name fake_behavior.exe }} were run by {{ user.name 5b4207f4-9cf0-47b0-b875-7384b2d292d7 }} from {{ user.domain 09yzh9bg35 }}, with network connections from {{ source.ip 10.63.82.62 }} to {{ destination.ip 10.43.183.158 }}.\n- The close timing, repeated use of credential access tools, and network activity between hosts indicate a coordinated attack chain involving credential dumping, malware propagation, and data collection/exfiltration.',
    entitySummaryMarkdown:
      'Credential access and malware on {{ host.name 1f217ee0-af2d-424b-b733-b0fdd726df69 }}.',
    mitreAttackTactics: [
      'Credential Access',
      'Execution',
      'Collection',
      'Command and Control',
      'Exfiltration',
    ],
    summaryMarkdown:
      'Credential dumping, malware, and data exfiltration on {{ host.name 1f217ee0-af2d-424b-b733-b0fdd726df69 }} and related hosts.',
    timestamp: '2025-06-10T12:34:53.366Z',
    title: 'Credential Access and Data Exfiltration',
  },
];
