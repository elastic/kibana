/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Run } from 'langsmith/schemas';

export const runWithReplacements: Run = {
  id: 'B7B03FEE-9AC4-4823-AEDB-F8EC20EAD5C4',
  inputs: {},
  name: 'test',
  outputs: {
    attackDiscoveries: [
      {
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
        detailsMarkdown:
          '- The attack began with the execution of a malicious file named `unix1` on the host `{{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }}` by the user `{{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}`.\n- The file `unix1` was detected at `{{ file.path /Users/james/unix1 }}` with a SHA256 hash of `{{ file.hash.sha256 0b18d6880dc9670ab2b955914598c96fc3d0097dc40ea61157b8c79e75edf231 }}`.\n- The process `{{ process.name My Go Application.app }}` was executed multiple times with different arguments, indicating potential persistence mechanisms.\n- The process `{{ process.name chmod }}` was used to change permissions of the file `unix1` to 777, making it executable.\n- A phishing attempt was detected via `osascript` on the same host, attempting to capture user credentials.\n- The attack involved multiple critical alerts, all indicating high-risk malware activity.',
        entitySummaryMarkdown:
          'The host `{{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }}` and user `{{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}` were involved in the attack.',
        mitreAttackTactics: ['Initial Access', 'Execution', 'Persistence', 'Credential Access'],
        summaryMarkdown:
          'A series of critical malware alerts were detected on the host `{{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }}` involving the user `{{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}`. The attack included the execution of a malicious file `unix1`, permission changes, and a phishing attempt via `osascript`.',
        title: 'Critical Malware Attack on macOS Host',
        timestamp: '2024-10-11T17:55:59.702Z',
      },
    ],
    replacements: {
      '039c15c5-3964-43e7-a891-42fe2ceeb9ff': 'james',
      '0b53f092-96dd-4282-bfb9-4f75a4530b80': 'root',
      '1123bd7b-3afb-45d1-801a-108f04e7cfb7': 'SRVWIN04',
      '3b9856bc-2c0d-4f1a-b9ae-32742e15ddd1': 'SRVWIN07',
      '5306bcfd-2729-49e3-bdf0-678002778ccf': 'SRVWIN01',
      '55af96a7-69b0-47cf-bf11-29be98a59eb0': 'SRVNIX05',
      '66919fe3-16a4-4dfe-bc90-713f0b33a2ff': 'Administrator',
      '9404361f-53fa-484f-adf8-24508256e70e': 'SRVWIN03',
      'e1cb3cf0-30f3-4f99-a9c8-518b955c6f90': 'SRVMAC08',
      'f59a00e2-f9c4-4069-8390-fd36ecd16918': 'SRVWIN02',
      'fc6d07da-5186-4d59-9b79-9382b0c226b3': 'SRVWIN06',
    },
  },
  run_type: 'evaluation',
};
