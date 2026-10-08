/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Snapshot of the original benchmark simulator output
// (chrysalis-sim/chrysalis_simulator.py _build_all_docs, default args).
// 97 docs: attack_chain 21, noise 25, supporting 35, threat_intel 15, on_call 1.
// Timestamps are re-stamped relative to seed time at runtime.

export interface ParityDoc {
  group: string;
  index: string;
  doc: Record<string, unknown>;
}

export const PARITY_DOCS: ParityDoc[] = [
  {
    doc: {
      '@timestamp': '2026-10-02T18:32:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: 'b5b73d58-8ea8-4ed0-82d6-6d51bb5446d6',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Users\\james_spiteri\\Desktop\\update.exe"'],
        args_count: 1,
        command_line: '"C:\\Users\\james_spiteri\\Desktop\\update.exe"',
        executable: 'C:\\Users\\james_spiteri\\Desktop\\update.exe',
        hash: {
          sha256: 'a511be5164dc1122fb5a7daa3eef9467e43d8458425b15a640235796006590c9',
        },
        name: 'update.exe',
        parent: {
          executable: 'C:\\Program Files\\Notepad++\\updater\\GUP.exe',
          name: 'GUP.exe',
          pid: 3201,
        },
        pid: 4242,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:32:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'cf28f49f-d2cd-47cf-a65f-1f6b3795f608',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '3f5104c3-9594-4e92-8a12-a12c3fda5cfa',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'a3c7f84f-f069-456f-b685-2de6947dec3e',
          },
          intended_timestamp: '2026-10-02T18:32:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T18:32:03.000Z',
          reason:
            'Execution of an installer (update.exe) from a user-writable directory, spawned by the Notepad++ updater (GUP.exe). Consistent with the supply-chain compromise pattern reported by Rapid7 for the Chrysalis backdoor (Lotus Blossom).',
          risk_score: 73,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description:
              'Execution of an installer (update.exe) from a user-writable directory, spawned by the Notepad++ updater (GUP.exe). Consistent with the supply-chain compromise pattern reported by Rapid7 for the Chrysalis backdoor (Lotus Blossom).',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Suspicious Installer Execution from User Directory',
            parameters: {
              description:
                'Execution of an installer (update.exe) from a user-writable directory, spawned by the Notepad++ updater (GUP.exe). Consistent with the supply-chain compromise pattern reported by Rapid7 for the Chrysalis backdoor (Lotus Blossom).',
              risk_score: 73,
              severity: 'high',
            },
            producer: 'siem',
            references: [],
            risk_score: 73,
            rule_id: '386bc014-2d28-5dbd-9208-0a22839b32b7',
            rule_type_id: 'siem.queryRule',
            severity: 'high',
            tags: [
              'Tactic: Initial Access',
              'Threat: Lotus Blossom',
              'Data Source: Elastic Defend',
            ],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0001',
                  name: 'Initial Access',
                  reference: 'https://attack.mitre.org/tactics/TA0001/',
                },
                technique: [
                  {
                    id: 'T1195.002',
                    name: 'Compromise Software Supply Chain',
                    reference: 'https://attack.mitre.org/techniques/T1195/002',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '386bc014-2d28-5dbd-9208-0a22839b32b7',
            version: 1,
          },
          severity: 'high',
          status: 'active',
          url: '',
          uuid: 'a3c7f84f-f069-456f-b685-2de6947dec3e',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T18:32:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: '"C:\\Users\\james_spiteri\\Desktop\\update.exe"',
        executable: 'C:\\Users\\james_spiteri\\Desktop\\update.exe',
        hash: {
          sha256: 'a511be5164dc1122fb5a7daa3eef9467e43d8458425b15a640235796006590c9',
        },
        name: 'update.exe',
        parent: {
          executable: 'C:\\Program Files\\Notepad++\\updater\\GUP.exe',
          name: 'GUP.exe',
        },
        pid: 4242,
      },
      signal: {
        original_time: '2026-10-02T18:32:03.000Z',
        rule: {
          description:
            'Execution of an installer (update.exe) from a user-writable directory, spawned by the Notepad++ updater (GUP.exe). Consistent with the supply-chain compromise pattern reported by Rapid7 for the Chrysalis backdoor (Lotus Blossom).',
          id: '386bc014-2d28-5dbd-9208-0a22839b32b7',
          name: 'Suspicious Installer Execution from User Directory',
          risk_score: 73,
          rule_id: '386bc014-2d28-5dbd-9208-0a22839b32b7',
          severity: 'high',
          tags: ['Tactic: Initial Access', 'Threat: Lotus Blossom', 'Data Source: Elastic Defend'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0001',
                name: 'Initial Access',
                reference: 'https://attack.mitre.org/tactics/TA0001/',
              },
              technique: [
                {
                  id: 'T1195.002',
                  name: 'Compromise Software Supply Chain',
                  reference: 'https://attack.mitre.org/techniques/T1195/002',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1195.002',
            name: 'Compromise Software Supply Chain',
          },
        ],
      },
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'attack_chain',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:34:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.file',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'file_creation',
        category: ['file'],
        dataset: 'endpoint.events.file',
        id: '928f69df-fe9a-42a3-a784-e9474fcb706d',
        kind: 'event',
        module: 'endpoint',
        type: ['creation'],
      },
      file: {
        directory: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth',
        extension: 'exe',
        hash: {
          sha256: '2da00de67720f5f13b17e9d985fe70f10f153da60c9ab1086fe58f069a156924',
        },
        name: 'BluetoothService.exe',
        path: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe',
        size: 473703,
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        name: 'update.exe',
        pid: 4242,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.file-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:34:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.file',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'file_creation',
        category: ['file'],
        dataset: 'endpoint.events.file',
        id: 'b749b572-3d4a-464c-bf49-8eec837185bb',
        kind: 'event',
        module: 'endpoint',
        type: ['creation'],
      },
      file: {
        directory: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth',
        hash: {
          sha256: '77bfea78def679aa1117f569a35e8fd1542df21f7e00e27f192c907e61d63a2e',
        },
        name: 'BluetoothService',
        path: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService',
        size: 276477,
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        name: 'update.exe',
        pid: 4242,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.file-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:34:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.file',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'file_creation',
        category: ['file'],
        dataset: 'endpoint.events.file',
        id: '63c5b7b9-8ee2-493c-b47d-849238ca41d5',
        kind: 'event',
        module: 'endpoint',
        type: ['creation'],
      },
      file: {
        directory: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth',
        extension: 'dll',
        hash: {
          sha256: '3bdc4c0637591533f1d4198a72a33426c01f69bd2e15ceee547866f65e26b7ad',
        },
        name: 'log.dll',
        path: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\log.dll',
        size: 444555,
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        name: 'update.exe',
        pid: 4242,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.file-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:34:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '609ff689-bff5-49cc-a8ee-07cd54867cb9',
        kind: 'signal',
        module: 'endpoint',
      },
      file: {
        directory: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth',
        hash: {
          sha256: '2da00de67720f5f13b17e9d985fe70f10f153da60c9ab1086fe58f069a156924',
        },
        name: 'BluetoothService.exe',
        path: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe',
      },
      host: {
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: 'cfc1abfb-a6a8-4a11-a56e-8883b0809480',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '95b68a87-81fe-4366-ac49-4c2cc0ab1c1f',
          },
          intended_timestamp: '2026-10-02T18:34:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T18:34:03.000Z',
          reason:
            'An NSIS-style installer (update.exe) wrote a renamed Bitdefender binary (BluetoothService.exe), an encrypted shellcode blob, and a side-loaded DLL (log.dll) into a newly created hidden directory under %AppData%. Matches the Chrysalis dropper behavior.',
          risk_score: 75,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description:
              'An NSIS-style installer (update.exe) wrote a renamed Bitdefender binary (BluetoothService.exe), an encrypted shellcode blob, and a side-loaded DLL (log.dll) into a newly created hidden directory under %AppData%. Matches the Chrysalis dropper behavior.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'NSIS Installer Drops Executable to Hidden AppData Folder',
            parameters: {
              description:
                'An NSIS-style installer (update.exe) wrote a renamed Bitdefender binary (BluetoothService.exe), an encrypted shellcode blob, and a side-loaded DLL (log.dll) into a newly created hidden directory under %AppData%. Matches the Chrysalis dropper behavior.',
              risk_score: 75,
              severity: 'high',
            },
            producer: 'siem',
            references: [],
            risk_score: 75,
            rule_id: 'bccfe9cf-9784-51d7-ac54-cf83ad17ec43',
            rule_type_id: 'siem.queryRule',
            severity: 'high',
            tags: ['Tactic: Execution', 'Threat: Lotus Blossom', 'Data Source: Elastic Defend'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1204.002',
                    name: 'User Execution: Malicious File',
                    reference: 'https://attack.mitre.org/techniques/T1204/002',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: 'bccfe9cf-9784-51d7-ac54-cf83ad17ec43',
            version: 1,
          },
          severity: 'high',
          status: 'active',
          url: '',
          uuid: '95b68a87-81fe-4366-ac49-4c2cc0ab1c1f',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T18:34:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        name: 'update.exe',
        pid: 4242,
      },
      signal: {
        original_time: '2026-10-02T18:34:03.000Z',
        rule: {
          description:
            'An NSIS-style installer (update.exe) wrote a renamed Bitdefender binary (BluetoothService.exe), an encrypted shellcode blob, and a side-loaded DLL (log.dll) into a newly created hidden directory under %AppData%. Matches the Chrysalis dropper behavior.',
          id: 'bccfe9cf-9784-51d7-ac54-cf83ad17ec43',
          name: 'NSIS Installer Drops Executable to Hidden AppData Folder',
          risk_score: 75,
          rule_id: 'bccfe9cf-9784-51d7-ac54-cf83ad17ec43',
          severity: 'high',
          tags: ['Tactic: Execution', 'Threat: Lotus Blossom', 'Data Source: Elastic Defend'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1204.002',
                  name: 'User Execution: Malicious File',
                  reference: 'https://attack.mitre.org/techniques/T1204/002',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1204.002',
            name: 'User Execution: Malicious File',
          },
        ],
      },
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'attack_chain',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:36:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '8fc0a620-99d6-4144-89bf-7af4a6693447',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: [
          'sc.exe',
          'create',
          'BluetoothService',
          'binPath=',
          '"C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe',
          '-k"',
          'start=',
          'auto',
          'type=',
          'own',
          'DisplayName=',
          '"Bluetooth',
          'Service"',
        ],
        args_count: 13,
        command_line:
          'sc.exe create BluetoothService binPath= "C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe -k" start= auto type= own DisplayName= "Bluetooth Service"',
        executable: 'C:\\Windows\\System32\\sc.exe',
        name: 'sc.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\cmd.exe',
          name: 'cmd.exe',
          pid: 4242,
        },
        pid: 5102,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:36:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.registry',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'registry_modification',
        category: ['registry', 'configuration'],
        dataset: 'endpoint.events.registry',
        id: '942929a3-ff69-411a-8838-3f888b207c1c',
        kind: 'event',
        module: 'endpoint',
        type: ['change'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        name: 'sc.exe',
        pid: 5102,
      },
      registry: {
        data: {
          strings: [
            'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe -k',
          ],
          type: 'REG_EXPAND_SZ',
        },
        hive: 'HKLM',
        key: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\BluetoothService\\ImagePath',
        path: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\BluetoothService\\ImagePath',
        value: 'ImagePath',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.registry-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:36:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'windows.sysmon_operational',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'service-installed',
        category: ['iam', 'configuration'],
        code: '4697',
        dataset: 'windows.sysmon_operational',
        id: 'f93c2898-d3c9-464b-a20d-51807a74bf7c',
        kind: 'event',
        module: 'windows',
        outcome: 'success',
        provider: 'Microsoft-Windows-Security-Auditing',
        type: ['installation'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      service: {
        name: 'BluetoothService',
        type: 'windows',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
      winlog: {
        channel: 'Security',
        event_data: {
          ServiceAccount: 'LocalSystem',
          ServiceFileName:
            'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe -k',
          ServiceName: 'BluetoothService',
          ServiceStartType: '2',
          ServiceType: '0x10',
        },
        event_id: '4697',
        provider_name: 'Microsoft-Windows-Security-Auditing',
      },
    },
    group: 'attack_chain',
    index: 'logs-windows.sysmon_operational-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:36:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'c33c04f9-8790-4a4a-b30d-0d042d5dbf7e',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '726dab68-d5b7-423f-bbfe-fd63f0716e1e',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'b7d6f64f-e757-49c7-a9c9-34d478b23dd6',
          },
          intended_timestamp: '2026-10-02T18:36:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T18:36:03.000Z',
          reason:
            'A new Windows service (BluetoothService) was registered with its binary path pointing at an executable in %AppData% — an unusual location for a SYSTEM-context service. Consistent with Chrysalis service persistence.',
          risk_score: 88,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description:
              'A new Windows service (BluetoothService) was registered with its binary path pointing at an executable in %AppData% — an unusual location for a SYSTEM-context service. Consistent with Chrysalis service persistence.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Windows Service Installed for Persistence in User AppData',
            parameters: {
              description:
                'A new Windows service (BluetoothService) was registered with its binary path pointing at an executable in %AppData% — an unusual location for a SYSTEM-context service. Consistent with Chrysalis service persistence.',
              risk_score: 88,
              severity: 'critical',
            },
            producer: 'siem',
            references: [],
            risk_score: 88,
            rule_id: 'fbd6352b-a521-53ba-961d-151d6acaa181',
            rule_type_id: 'siem.queryRule',
            severity: 'critical',
            tags: ['Tactic: Persistence', 'Threat: Lotus Blossom', 'Data Source: Elastic Defend'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0003',
                  name: 'Persistence',
                  reference: 'https://attack.mitre.org/tactics/TA0003/',
                },
                technique: [
                  {
                    id: 'T1543.003',
                    name: 'Create or Modify System Process: Windows Service',
                    reference: 'https://attack.mitre.org/techniques/T1543/003',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: 'fbd6352b-a521-53ba-961d-151d6acaa181',
            version: 1,
          },
          severity: 'critical',
          status: 'active',
          url: '',
          uuid: 'b7d6f64f-e757-49c7-a9c9-34d478b23dd6',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T18:36:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line:
          'sc.exe create BluetoothService binPath= "C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe -k" start= auto type= own DisplayName= "Bluetooth Service"',
        executable: 'C:\\Windows\\System32\\sc.exe',
        name: 'sc.exe',
        parent: {
          name: 'cmd.exe',
        },
        pid: 5102,
      },
      registry: {
        path: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\BluetoothService\\ImagePath',
        value: 'ImagePath',
      },
      signal: {
        original_time: '2026-10-02T18:36:03.000Z',
        rule: {
          description:
            'A new Windows service (BluetoothService) was registered with its binary path pointing at an executable in %AppData% — an unusual location for a SYSTEM-context service. Consistent with Chrysalis service persistence.',
          id: 'fbd6352b-a521-53ba-961d-151d6acaa181',
          name: 'Windows Service Installed for Persistence in User AppData',
          risk_score: 88,
          rule_id: 'fbd6352b-a521-53ba-961d-151d6acaa181',
          severity: 'critical',
          tags: ['Tactic: Persistence', 'Threat: Lotus Blossom', 'Data Source: Elastic Defend'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0003',
                name: 'Persistence',
                reference: 'https://attack.mitre.org/tactics/TA0003/',
              },
              technique: [
                {
                  id: 'T1543.003',
                  name: 'Create or Modify System Process: Windows Service',
                  reference: 'https://attack.mitre.org/techniques/T1543/003',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1543.003',
            name: 'Create or Modify System Process: Windows Service',
          },
        ],
      },
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'attack_chain',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:38:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: 'a25f1914-d73e-4259-b86c-26f31dd3d093',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: [
          '"C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe"',
          '-k',
        ],
        args_count: 2,
        code_signature: {
          exists: true,
          status: 'trusted',
          subject_name: 'Bitdefender SRL',
          trusted: true,
        },
        command_line:
          '"C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe" -k',
        executable: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe',
        hash: {
          sha256: '2da00de67720f5f13b17e9d985fe70f10f153da60c9ab1086fe58f069a156924',
        },
        name: 'BluetoothService.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\services.exe',
          name: 'services.exe',
          pid: 712,
        },
        pid: 6201,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:38:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.file',
        namespace: 'default',
        type: 'logs',
      },
      dll: {
        code_signature: {
          exists: false,
          status: 'untrusted',
          trusted: false,
        },
        hash: {
          sha256: '3bdc4c0637591533f1d4198a72a33426c01f69bd2e15ceee547866f65e26b7ad',
        },
        name: 'log.dll',
        path: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\log.dll',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'file_load',
        category: ['library'],
        dataset: 'endpoint.events.file',
        id: 'fff34695-133d-4426-9671-9f7767777246',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      file: {
        directory: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth',
        extension: 'dll',
        hash: {
          sha256: '3bdc4c0637591533f1d4198a72a33426c01f69bd2e15ceee547866f65e26b7ad',
        },
        name: 'log.dll',
        path: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\log.dll',
        size: 1024,
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.file-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:38:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'a27ab70d-ba7e-4ec5-b849-b97b2393abe1',
        kind: 'signal',
        module: 'endpoint',
      },
      file: {
        hash: {
          sha256: '3bdc4c0637591533f1d4198a72a33426c01f69bd2e15ceee547866f65e26b7ad',
        },
        name: 'log.dll',
        path: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\log.dll',
      },
      host: {
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '73f5c0f9-4817-4b09-ad35-4442155baddd',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '87db1606-2b48-49b7-a5bb-e835aca0f7c2',
          },
          intended_timestamp: '2026-10-02T18:38:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T18:38:03.000Z',
          reason:
            'BluetoothService.exe (a renamed, signed Bitdefender Submission Wizard) loaded an unsigned log.dll from the same AppData folder. Classic DLL side-loading pattern — the Chrysalis loader uses LogInit/LogWrite exports of log.dll to decrypt and execute the embedded shellcode.',
          risk_score: 90,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description:
              'BluetoothService.exe (a renamed, signed Bitdefender Submission Wizard) loaded an unsigned log.dll from the same AppData folder. Classic DLL side-loading pattern — the Chrysalis loader uses LogInit/LogWrite exports of log.dll to decrypt and execute the embedded shellcode.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'DLL Side-Loading via Signed Bitdefender Binary',
            parameters: {
              description:
                'BluetoothService.exe (a renamed, signed Bitdefender Submission Wizard) loaded an unsigned log.dll from the same AppData folder. Classic DLL side-loading pattern — the Chrysalis loader uses LogInit/LogWrite exports of log.dll to decrypt and execute the embedded shellcode.',
              risk_score: 90,
              severity: 'critical',
            },
            producer: 'siem',
            references: [],
            risk_score: 90,
            rule_id: '0bbb8807-1162-5307-910e-a1790dd23fa5',
            rule_type_id: 'siem.queryRule',
            severity: 'critical',
            tags: [
              'Tactic: Defense Evasion',
              'Threat: Lotus Blossom',
              'Data Source: Elastic Defend',
            ],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0005',
                  name: 'Defense Evasion',
                  reference: 'https://attack.mitre.org/tactics/TA0005/',
                },
                technique: [
                  {
                    id: 'T1574.002',
                    name: 'Hijack Execution Flow: DLL Side-Loading',
                    reference: 'https://attack.mitre.org/techniques/T1574/002',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '0bbb8807-1162-5307-910e-a1790dd23fa5',
            version: 1,
          },
          severity: 'critical',
          status: 'active',
          url: '',
          uuid: '87db1606-2b48-49b7-a5bb-e835aca0f7c2',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T18:38:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        code_signature: {
          exists: true,
          subject_name: 'Bitdefender SRL',
          trusted: true,
        },
        executable: 'C:\\Users\\james_spiteri\\AppData\\Roaming\\Bluetooth\\BluetoothService.exe',
        hash: {
          sha256: '2da00de67720f5f13b17e9d985fe70f10f153da60c9ab1086fe58f069a156924',
        },
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      signal: {
        original_time: '2026-10-02T18:38:03.000Z',
        rule: {
          description:
            'BluetoothService.exe (a renamed, signed Bitdefender Submission Wizard) loaded an unsigned log.dll from the same AppData folder. Classic DLL side-loading pattern — the Chrysalis loader uses LogInit/LogWrite exports of log.dll to decrypt and execute the embedded shellcode.',
          id: '0bbb8807-1162-5307-910e-a1790dd23fa5',
          name: 'DLL Side-Loading via Signed Bitdefender Binary',
          risk_score: 90,
          rule_id: '0bbb8807-1162-5307-910e-a1790dd23fa5',
          severity: 'critical',
          tags: ['Tactic: Defense Evasion', 'Threat: Lotus Blossom', 'Data Source: Elastic Defend'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0005',
                name: 'Defense Evasion',
                reference: 'https://attack.mitre.org/tactics/TA0005/',
              },
              technique: [
                {
                  id: 'T1574.002',
                  name: 'Hijack Execution Flow: DLL Side-Loading',
                  reference: 'https://attack.mitre.org/techniques/T1574/002',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1574.002',
            name: 'Hijack Execution Flow: DLL Side-Loading',
          },
        ],
      },
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:40:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      dns: {
        answers: [
          {
            data: '61.4.102.97',
            name: 'api.skycloudcenter.com',
            type: 'A',
          },
        ],
        question: {
          name: 'api.skycloudcenter.com',
          type: 'A',
        },
        resolved_ip: ['61.4.102.97'],
        type: 'query',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'lookup_requested',
        category: ['network', 'dns'],
        dataset: 'endpoint.events.network',
        id: 'b23cd623-a734-4550-963d-162d2a102509',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['protocol', 'connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        protocol: 'dns',
        transport: 'udp',
      },
      process: {
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:45:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 2794,
        domain: 'api.skycloudcenter.com',
        ip: '61.4.102.97',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: 'ac318b9d-fd1f-44c6-82e9-6ab28fc15e40',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 3526,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      source: {
        bytes: 732,
        ip: '10.42.18.27',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'api.skycloudcenter.com',
      },
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:50:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 2512,
        domain: 'api.skycloudcenter.com',
        ip: '61.4.102.97',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: 'd3dd0816-967b-4397-963a-a6618021720e',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 3145,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      source: {
        bytes: 633,
        ip: '10.42.18.27',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'api.skycloudcenter.com',
      },
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:55:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 2281,
        domain: 'api.skycloudcenter.com',
        ip: '61.4.102.97',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '1749f386-f181-4937-938d-207a1fc3d5c7',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 3010,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      source: {
        bytes: 729,
        ip: '10.42.18.27',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'api.skycloudcenter.com',
      },
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:00:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 2614,
        domain: 'api.skycloudcenter.com',
        ip: '61.4.102.97',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '04a5c1fe-b984-4dc9-8c49-432d199e3076',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 3287,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      source: {
        bytes: 673,
        ip: '10.42.18.27',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'api.skycloudcenter.com',
      },
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:05:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 2523,
        domain: 'api.skycloudcenter.com',
        ip: '61.4.102.97',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '2b66dca0-7bfc-401c-9bb4-6b47ec036480',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 3201,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      source: {
        bytes: 678,
        ip: '10.42.18.27',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'api.skycloudcenter.com',
      },
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:10:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 2277,
        domain: 'api.skycloudcenter.com',
        ip: '61.4.102.97',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '02fc0203-c9c2-4b57-a678-235eea603aca',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 2870,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      source: {
        bytes: 593,
        ip: '10.42.18.27',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'api.skycloudcenter.com',
      },
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T18:40:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      dns: {
        question: {
          name: 'api.skycloudcenter.com',
          type: 'A',
        },
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '729ac1ee-c0f5-4e65-a2cb-d815aaa695f0',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '3490dc9f-f157-47ae-adfe-e8aa6f9bc7c3',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '414edeb6-a956-46e4-92eb-8868c3426043',
          },
          intended_timestamp: '2026-10-02T18:40:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T18:40:03.000Z',
          reason:
            'Process BluetoothService.exe issued a DNS query for api.skycloudcenter.com — a domain attributed by Rapid7 to the Chrysalis backdoor C2 infrastructure (Lotus Blossom).',
          risk_score: 95,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description:
              'Process BluetoothService.exe issued a DNS query for api.skycloudcenter.com — a domain attributed by Rapid7 to the Chrysalis backdoor C2 infrastructure (Lotus Blossom).',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Suspicious DNS Beacon to Known Malicious Domain',
            parameters: {
              description:
                'Process BluetoothService.exe issued a DNS query for api.skycloudcenter.com — a domain attributed by Rapid7 to the Chrysalis backdoor C2 infrastructure (Lotus Blossom).',
              risk_score: 95,
              severity: 'critical',
            },
            producer: 'siem',
            references: [],
            risk_score: 95,
            rule_id: 'e8abe0dc-2232-5eff-8436-8ee3a76d8ea2',
            rule_type_id: 'siem.queryRule',
            severity: 'critical',
            tags: [
              'Tactic: Command and Control',
              'Threat: Lotus Blossom',
              'Data Source: Elastic Defend',
            ],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0011',
                  name: 'Command and Control',
                  reference: 'https://attack.mitre.org/tactics/TA0011/',
                },
                technique: [
                  {
                    id: 'T1071.004',
                    name: 'Application Layer Protocol: DNS',
                    reference: 'https://attack.mitre.org/techniques/T1071/004',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: 'e8abe0dc-2232-5eff-8436-8ee3a76d8ea2',
            version: 1,
          },
          severity: 'critical',
          status: 'active',
          url: '',
          uuid: '414edeb6-a956-46e4-92eb-8868c3426043',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T18:40:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        protocol: 'dns',
        transport: 'udp',
      },
      process: {
        name: 'BluetoothService.exe',
        pid: 6201,
      },
      signal: {
        original_time: '2026-10-02T18:40:03.000Z',
        rule: {
          description:
            'Process BluetoothService.exe issued a DNS query for api.skycloudcenter.com — a domain attributed by Rapid7 to the Chrysalis backdoor C2 infrastructure (Lotus Blossom).',
          id: 'e8abe0dc-2232-5eff-8436-8ee3a76d8ea2',
          name: 'Suspicious DNS Beacon to Known Malicious Domain',
          risk_score: 95,
          rule_id: 'e8abe0dc-2232-5eff-8436-8ee3a76d8ea2',
          severity: 'critical',
          tags: [
            'Tactic: Command and Control',
            'Threat: Lotus Blossom',
            'Data Source: Elastic Defend',
          ],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0011',
                name: 'Command and Control',
                reference: 'https://attack.mitre.org/tactics/TA0011/',
              },
              technique: [
                {
                  id: 'T1071.004',
                  name: 'Application Layer Protocol: DNS',
                  reference: 'https://attack.mitre.org/techniques/T1071/004',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1071.004',
            name: 'Application Layer Protocol: DNS',
          },
        ],
      },
      user: {
        domain: 'NT AUTHORITY',
        name: 'SYSTEM',
      },
    },
    group: 'attack_chain',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T19:36:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'b230046b-4483-4ee9-bb1b-a19f5ca38d70',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-marketing-04',
        ip: ['10.42.20.55'],
        name: 'ws-marketing-04',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '5f78b4dc-c931-4ba7-8957-860d183b64c8',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '5256daaa-1171-4fd4-996a-54ff122157ed',
          },
          intended_timestamp: '2026-10-01T19:36:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-01T19:36:03.000Z',
          reason: 'Windows Defender flagged a PUA bundle on a workstation.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'Windows Defender flagged a PUA bundle on a workstation.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Windows Defender Detected Potentially Unwanted Application',
            parameters: {
              description: 'Windows Defender flagged a PUA bundle on a workstation.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: 'b9886131-34bd-5623-9e5d-f256ca579c38',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Defender'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0001',
                  name: 'Initial Access',
                  reference: 'https://attack.mitre.org/tactics/TA0001/',
                },
                technique: [
                  {
                    id: 'T1566',
                    name: 'Phishing',
                    reference: 'https://attack.mitre.org/techniques/T1566',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: 'b9886131-34bd-5623-9e5d-f256ca579c38',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '5256daaa-1171-4fd4-996a-54ff122157ed',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-01T19:36:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-01T19:36:03.000Z',
        rule: {
          description: 'Windows Defender flagged a PUA bundle on a workstation.',
          id: 'b9886131-34bd-5623-9e5d-f256ca579c38',
          name: 'Windows Defender Detected Potentially Unwanted Application',
          risk_score: 21,
          rule_id: 'b9886131-34bd-5623-9e5d-f256ca579c38',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Defender'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0001',
                name: 'Initial Access',
                reference: 'https://attack.mitre.org/tactics/TA0001/',
              },
              technique: [
                {
                  id: 'T1566',
                  name: 'Phishing',
                  reference: 'https://attack.mitre.org/techniques/T1566',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1566',
            name: 'Phishing',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T01:08:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'd9897c19-021e-4a2a-84e6-91eb3ee35064',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-db-staging-01',
        ip: ['10.42.18.42'],
        name: 'srv-db-staging-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '7e9f1652-4eca-4c12-88e0-41b30585d38c',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'f9a11239-9beb-4ffe-8c98-e15df75d5d21',
          },
          intended_timestamp: '2026-10-02T01:08:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T01:08:03.000Z',
          reason: 'A PowerShell command was logged via ScriptBlockLogging.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A PowerShell command was logged via ScriptBlockLogging.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'PowerShell Script Block Logged',
            parameters: {
              description: 'A PowerShell command was logged via ScriptBlockLogging.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '80f6561c-17d3-509b-a584-78c8232d4908',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Execution'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1059.001',
                    name: 'PowerShell',
                    reference: 'https://attack.mitre.org/techniques/T1059/001',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '80f6561c-17d3-509b-a584-78c8232d4908',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: 'f9a11239-9beb-4ffe-8c98-e15df75d5d21',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T01:08:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: 'powershell.exe -ExecutionPolicy Bypass -File C:\\scripts\\maintenance.ps1',
        name: 'powershell.exe',
        pid: 2089,
      },
      signal: {
        original_time: '2026-10-02T01:08:03.000Z',
        rule: {
          description: 'A PowerShell command was logged via ScriptBlockLogging.',
          id: '80f6561c-17d3-509b-a584-78c8232d4908',
          name: 'PowerShell Script Block Logged',
          risk_score: 21,
          rule_id: '80f6561c-17d3-509b-a584-78c8232d4908',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Execution'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1059.001',
                  name: 'PowerShell',
                  reference: 'https://attack.mitre.org/techniques/T1059/001',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1059.001',
            name: 'PowerShell',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'priya_kapoor',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T21:27:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '14be26a4-2d00-478b-9d12-345519dbff07',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-app-prod-03',
        ip: ['10.42.18.30'],
        name: 'srv-app-prod-03',
        os: {
          family: 'windows',
          name: 'Windows Server 2019',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '31801246-e5b3-472e-8e31-c8b2b756a86a',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'cb1858b6-9526-40f1-acf1-917b3719e040',
          },
          intended_timestamp: '2026-10-01T21:27:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-01T21:27:03.000Z',
          reason: 'Outbound HTTPS request used a non-standard User-Agent string.',
          risk_score: 47,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'Outbound HTTPS request used a non-standard User-Agent string.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Suspicious User Agent in Web Traffic',
            parameters: {
              description: 'Outbound HTTPS request used a non-standard User-Agent string.',
              risk_score: 47,
              severity: 'medium',
            },
            producer: 'siem',
            references: [],
            risk_score: 47,
            rule_id: '45202192-b161-5d41-adca-6566899ed804',
            rule_type_id: 'siem.queryRule',
            severity: 'medium',
            tags: ['Noise: Unrelated', 'Category: Network'],
            to: 'now',
            uuid: '45202192-b161-5d41-adca-6566899ed804',
            version: 1,
          },
          severity: 'medium',
          status: 'active',
          url: '',
          uuid: 'cb1858b6-9526-40f1-acf1-917b3719e040',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-01T21:27:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-01T21:27:03.000Z',
        rule: {
          description: 'Outbound HTTPS request used a non-standard User-Agent string.',
          id: '45202192-b161-5d41-adca-6566899ed804',
          name: 'Suspicious User Agent in Web Traffic',
          risk_score: 47,
          rule_id: '45202192-b161-5d41-adca-6566899ed804',
          severity: 'medium',
          tags: ['Noise: Unrelated', 'Category: Network'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'admin_helpdesk',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T01:13:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '28a6e243-69ea-4cc1-ba9c-0b5d9ba0ff06',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-db-staging-01',
        ip: ['10.42.18.42'],
        name: 'srv-db-staging-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '64a94026-1e5f-433e-af73-a8da4638f96d',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'a8531d5d-39a0-4887-91cf-2e08591cc1e3',
          },
          intended_timestamp: '2026-10-02T01:13:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T01:13:03.000Z',
          reason: 'Active Directory GPO was modified.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'Active Directory GPO was modified.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Group Policy Object Modified',
            parameters: {
              description: 'Active Directory GPO was modified.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Audit'],
            to: 'now',
            uuid: '2ab3f502-408e-53ed-8309-0bc3373a4626',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: 'a8531d5d-39a0-4887-91cf-2e08591cc1e3',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T01:13:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T01:13:03.000Z',
        rule: {
          description: 'Active Directory GPO was modified.',
          id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
          name: 'Group Policy Object Modified',
          risk_score: 21,
          rule_id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Audit'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T17:17:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'b427c4bb-91ed-423e-90b9-09d24483ca3a',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-finance-12',
        ip: ['10.42.20.78'],
        name: 'ws-finance-12',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '250b6d21-a84b-4f31-8a08-8aeac3cee066',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '818ff279-5635-46a1-bee3-cf9677b81cbc',
          },
          intended_timestamp: '2026-10-02T17:17:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T17:17:03.000Z',
          reason: 'Defender failed to update its signature database within the expected window.',
          risk_score: 14,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description:
              'Defender failed to update its signature database within the expected window.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Windows Defender Signature Update Failed',
            parameters: {
              description:
                'Defender failed to update its signature database within the expected window.',
              risk_score: 14,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 14,
            rule_id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Defender'],
            to: 'now',
            uuid: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '818ff279-5635-46a1-bee3-cf9677b81cbc',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T17:17:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T17:17:03.000Z',
        rule: {
          description:
            'Defender failed to update its signature database within the expected window.',
          id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
          name: 'Windows Defender Signature Update Failed',
          risk_score: 14,
          rule_id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Defender'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T05:32:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '2c519e64-01ec-4a13-a892-1f1b0b45398d',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-db-staging-01',
        ip: ['10.42.18.42'],
        name: 'srv-db-staging-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '5372fc29-3196-4993-943a-f74df11ffea7',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'cb271d8a-a6ae-4a78-aeaa-67752cb4541b',
          },
          intended_timestamp: '2026-10-02T05:32:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T05:32:03.000Z',
          reason: 'Defender failed to update its signature database within the expected window.',
          risk_score: 14,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description:
              'Defender failed to update its signature database within the expected window.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Windows Defender Signature Update Failed',
            parameters: {
              description:
                'Defender failed to update its signature database within the expected window.',
              risk_score: 14,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 14,
            rule_id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Defender'],
            to: 'now',
            uuid: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: 'cb271d8a-a6ae-4a78-aeaa-67752cb4541b',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T05:32:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T05:32:03.000Z',
        rule: {
          description:
            'Defender failed to update its signature database within the expected window.',
          id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
          name: 'Windows Defender Signature Update Failed',
          risk_score: 14,
          rule_id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Defender'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T16:27:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'd5b60b6f-e3ed-4046-90ce-84506010ddc9',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-eng-19',
        ip: ['10.42.20.91'],
        name: 'ws-eng-19',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: 'a5cd0472-1faa-44fc-9b50-466d26ab7083',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'c24b2120-946b-4056-be7c-b7f375f69727',
          },
          intended_timestamp: '2026-10-02T16:27:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T16:27:03.000Z',
          reason: 'A SIEM detection rule was modified by an administrator.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A SIEM detection rule was modified by an administrator.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Detection Rule Modified',
            parameters: {
              description: 'A SIEM detection rule was modified by an administrator.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: 'bd83da67-bde6-5423-a4e1-f1f6cc0ee25a',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Audit'],
            to: 'now',
            uuid: 'bd83da67-bde6-5423-a4e1-f1f6cc0ee25a',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: 'c24b2120-946b-4056-be7c-b7f375f69727',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T16:27:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T16:27:03.000Z',
        rule: {
          description: 'A SIEM detection rule was modified by an administrator.',
          id: 'bd83da67-bde6-5423-a4e1-f1f6cc0ee25a',
          name: 'Detection Rule Modified',
          risk_score: 21,
          rule_id: 'bd83da67-bde6-5423-a4e1-f1f6cc0ee25a',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Audit'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'admin_helpdesk',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T20:57:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'd8769f61-41a9-40e2-888e-2bcf5f9a8eab',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-finance-12',
        ip: ['10.42.20.78'],
        name: 'ws-finance-12',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: 'a540758f-9421-4adc-83dc-6281aadc675d',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '179013af-23c2-422f-a944-eec6c87af95f',
          },
          intended_timestamp: '2026-10-01T20:57:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-01T20:57:03.000Z',
          reason: 'A new scheduled task was created via schtasks.exe.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A new scheduled task was created via schtasks.exe.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Scheduled Task Created',
            parameters: {
              description: 'A new scheduled task was created via schtasks.exe.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Execution'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1053.005',
                    name: 'Scheduled Task',
                    reference: 'https://attack.mitre.org/techniques/T1053/005',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '8b71460d-e651-5918-a26d-230e55e877f9',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '179013af-23c2-422f-a944-eec6c87af95f',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-01T20:57:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: 'schtasks.exe /create /sc daily /tn BackupTask /tr C:\\backup\\run.cmd',
        name: 'schtasks.exe',
        pid: 8966,
      },
      signal: {
        original_time: '2026-10-01T20:57:03.000Z',
        rule: {
          description: 'A new scheduled task was created via schtasks.exe.',
          id: '8b71460d-e651-5918-a26d-230e55e877f9',
          name: 'Scheduled Task Created',
          risk_score: 21,
          rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Execution'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1053.005',
                  name: 'Scheduled Task',
                  reference: 'https://attack.mitre.org/techniques/T1053/005',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1053.005',
            name: 'Scheduled Task',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'admin_helpdesk',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T19:49:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'b5c03433-4a7d-4039-ae75-27c8737fee06',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-eng-19',
        ip: ['10.42.20.91'],
        name: 'ws-eng-19',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: 'fbe24a28-2bf3-4a6c-940e-cfb398f385d5',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'b15e7b3a-20a0-4d9a-b28f-46ffdfce490f',
          },
          intended_timestamp: '2026-10-01T19:49:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-01T19:49:03.000Z',
          reason: 'A new scheduled task was created via schtasks.exe.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A new scheduled task was created via schtasks.exe.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Scheduled Task Created',
            parameters: {
              description: 'A new scheduled task was created via schtasks.exe.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Execution'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1053.005',
                    name: 'Scheduled Task',
                    reference: 'https://attack.mitre.org/techniques/T1053/005',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '8b71460d-e651-5918-a26d-230e55e877f9',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: 'b15e7b3a-20a0-4d9a-b28f-46ffdfce490f',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-01T19:49:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: 'schtasks.exe /create /sc daily /tn BackupTask /tr C:\\backup\\run.cmd',
        name: 'schtasks.exe',
        pid: 2982,
      },
      signal: {
        original_time: '2026-10-01T19:49:03.000Z',
        rule: {
          description: 'A new scheduled task was created via schtasks.exe.',
          id: '8b71460d-e651-5918-a26d-230e55e877f9',
          name: 'Scheduled Task Created',
          risk_score: 21,
          rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Execution'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1053.005',
                  name: 'Scheduled Task',
                  reference: 'https://attack.mitre.org/techniques/T1053/005',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1053.005',
            name: 'Scheduled Task',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'priya_kapoor',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T00:28:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'cbec013d-26a0-4ef4-a707-6826c38977d9',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-app-prod-03',
        ip: ['10.42.18.30'],
        name: 'srv-app-prod-03',
        os: {
          family: 'windows',
          name: 'Windows Server 2019',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: 'ee0da6d2-831c-4b02-a162-36cbe7ddef23',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '55d9045c-1211-4f23-882d-9dbef4fb9bca',
          },
          intended_timestamp: '2026-10-02T00:28:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T00:28:03.000Z',
          reason: 'Active Directory GPO was modified.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'Active Directory GPO was modified.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Group Policy Object Modified',
            parameters: {
              description: 'Active Directory GPO was modified.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Audit'],
            to: 'now',
            uuid: '2ab3f502-408e-53ed-8309-0bc3373a4626',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '55d9045c-1211-4f23-882d-9dbef4fb9bca',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T00:28:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T00:28:03.000Z',
        rule: {
          description: 'Active Directory GPO was modified.',
          id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
          name: 'Group Policy Object Modified',
          risk_score: 21,
          rule_id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Audit'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'priya_kapoor',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T07:36:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '1c8308ef-d039-4ed9-8a84-c5076be68758',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-sales-07',
        ip: ['10.42.20.63'],
        name: 'ws-sales-07',
        os: {
          family: 'windows',
          name: 'Windows 10',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '22c1a638-5c67-4698-bb13-b512ccd7493f',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '9d27b2bf-27ad-4566-abd5-533e85e48964',
          },
          intended_timestamp: '2026-10-02T07:36:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T07:36:03.000Z',
          reason: 'A PowerShell command was logged via ScriptBlockLogging.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A PowerShell command was logged via ScriptBlockLogging.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'PowerShell Script Block Logged',
            parameters: {
              description: 'A PowerShell command was logged via ScriptBlockLogging.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '80f6561c-17d3-509b-a584-78c8232d4908',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Execution'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1059.001',
                    name: 'PowerShell',
                    reference: 'https://attack.mitre.org/techniques/T1059/001',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '80f6561c-17d3-509b-a584-78c8232d4908',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '9d27b2bf-27ad-4566-abd5-533e85e48964',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T07:36:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: 'powershell.exe -ExecutionPolicy Bypass -File C:\\scripts\\maintenance.ps1',
        name: 'powershell.exe',
        pid: 8733,
      },
      signal: {
        original_time: '2026-10-02T07:36:03.000Z',
        rule: {
          description: 'A PowerShell command was logged via ScriptBlockLogging.',
          id: '80f6561c-17d3-509b-a584-78c8232d4908',
          name: 'PowerShell Script Block Logged',
          risk_score: 21,
          rule_id: '80f6561c-17d3-509b-a584-78c8232d4908',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Execution'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1059.001',
                  name: 'PowerShell',
                  reference: 'https://attack.mitre.org/techniques/T1059/001',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1059.001',
            name: 'PowerShell',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'service_backup',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T02:10:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '299f6384-5e52-4383-9233-662001a5606b',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-app-prod-03',
        ip: ['10.42.18.30'],
        name: 'srv-app-prod-03',
        os: {
          family: 'windows',
          name: 'Windows Server 2019',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '8dc0d5b0-5969-4bf5-af8f-88151650173c',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '3273a458-8c2d-4776-8588-a8cbcda74ca2',
          },
          intended_timestamp: '2026-10-02T02:10:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T02:10:03.000Z',
          reason: 'Defender failed to update its signature database within the expected window.',
          risk_score: 14,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description:
              'Defender failed to update its signature database within the expected window.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Windows Defender Signature Update Failed',
            parameters: {
              description:
                'Defender failed to update its signature database within the expected window.',
              risk_score: 14,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 14,
            rule_id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Defender'],
            to: 'now',
            uuid: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '3273a458-8c2d-4776-8588-a8cbcda74ca2',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T02:10:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T02:10:03.000Z',
        rule: {
          description:
            'Defender failed to update its signature database within the expected window.',
          id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
          name: 'Windows Defender Signature Update Failed',
          risk_score: 14,
          rule_id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Defender'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T00:55:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'f1e7293c-043b-4f08-9bad-48c2db179901',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-sales-07',
        ip: ['10.42.20.63'],
        name: 'ws-sales-07',
        os: {
          family: 'windows',
          name: 'Windows 10',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: 'fa32c561-76f1-4b95-9a2d-ea8b9546226d',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'ec5e5d95-af95-4bba-9790-aa7d272f63d9',
          },
          intended_timestamp: '2026-10-02T00:55:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T00:55:03.000Z',
          reason: 'Windows Defender flagged a PUA bundle on a workstation.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'Windows Defender flagged a PUA bundle on a workstation.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Windows Defender Detected Potentially Unwanted Application',
            parameters: {
              description: 'Windows Defender flagged a PUA bundle on a workstation.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: 'b9886131-34bd-5623-9e5d-f256ca579c38',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Defender'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0001',
                  name: 'Initial Access',
                  reference: 'https://attack.mitre.org/tactics/TA0001/',
                },
                technique: [
                  {
                    id: 'T1566',
                    name: 'Phishing',
                    reference: 'https://attack.mitre.org/techniques/T1566',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: 'b9886131-34bd-5623-9e5d-f256ca579c38',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: 'ec5e5d95-af95-4bba-9790-aa7d272f63d9',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T00:55:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T00:55:03.000Z',
        rule: {
          description: 'Windows Defender flagged a PUA bundle on a workstation.',
          id: 'b9886131-34bd-5623-9e5d-f256ca579c38',
          name: 'Windows Defender Detected Potentially Unwanted Application',
          risk_score: 21,
          rule_id: 'b9886131-34bd-5623-9e5d-f256ca579c38',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Defender'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0001',
                name: 'Initial Access',
                reference: 'https://attack.mitre.org/tactics/TA0001/',
              },
              technique: [
                {
                  id: 'T1566',
                  name: 'Phishing',
                  reference: 'https://attack.mitre.org/techniques/T1566',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1566',
            name: 'Phishing',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T16:45:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '572e9f13-eac8-47cd-a16f-32fab166f3d8',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-db-staging-01',
        ip: ['10.42.18.42'],
        name: 'srv-db-staging-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: 'ffab6fdc-afee-4bfe-a575-830b6ea33816',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'e7bfc279-9bc0-4637-8961-0412110d5379',
          },
          intended_timestamp: '2026-10-02T16:45:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T16:45:03.000Z',
          reason: 'Outbound HTTPS request used a non-standard User-Agent string.',
          risk_score: 47,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'Outbound HTTPS request used a non-standard User-Agent string.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Suspicious User Agent in Web Traffic',
            parameters: {
              description: 'Outbound HTTPS request used a non-standard User-Agent string.',
              risk_score: 47,
              severity: 'medium',
            },
            producer: 'siem',
            references: [],
            risk_score: 47,
            rule_id: '45202192-b161-5d41-adca-6566899ed804',
            rule_type_id: 'siem.queryRule',
            severity: 'medium',
            tags: ['Noise: Unrelated', 'Category: Network'],
            to: 'now',
            uuid: '45202192-b161-5d41-adca-6566899ed804',
            version: 1,
          },
          severity: 'medium',
          status: 'active',
          url: '',
          uuid: 'e7bfc279-9bc0-4637-8961-0412110d5379',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T16:45:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T16:45:03.000Z',
        rule: {
          description: 'Outbound HTTPS request used a non-standard User-Agent string.',
          id: '45202192-b161-5d41-adca-6566899ed804',
          name: 'Suspicious User Agent in Web Traffic',
          risk_score: 47,
          rule_id: '45202192-b161-5d41-adca-6566899ed804',
          severity: 'medium',
          tags: ['Noise: Unrelated', 'Category: Network'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'admin_helpdesk',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T13:54:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'de40fb35-1227-45a0-addd-4ae3440785e4',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-marketing-04',
        ip: ['10.42.20.55'],
        name: 'ws-marketing-04',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '85612104-4e5e-44c0-9107-e8593682275f',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'fba448bc-6a2d-422c-b14c-fec24037458f',
          },
          intended_timestamp: '2026-10-02T13:54:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T13:54:03.000Z',
          reason: 'A PowerShell command was logged via ScriptBlockLogging.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A PowerShell command was logged via ScriptBlockLogging.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'PowerShell Script Block Logged',
            parameters: {
              description: 'A PowerShell command was logged via ScriptBlockLogging.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '80f6561c-17d3-509b-a584-78c8232d4908',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Execution'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1059.001',
                    name: 'PowerShell',
                    reference: 'https://attack.mitre.org/techniques/T1059/001',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '80f6561c-17d3-509b-a584-78c8232d4908',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: 'fba448bc-6a2d-422c-b14c-fec24037458f',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T13:54:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: 'powershell.exe -ExecutionPolicy Bypass -File C:\\scripts\\maintenance.ps1',
        name: 'powershell.exe',
        pid: 1629,
      },
      signal: {
        original_time: '2026-10-02T13:54:03.000Z',
        rule: {
          description: 'A PowerShell command was logged via ScriptBlockLogging.',
          id: '80f6561c-17d3-509b-a584-78c8232d4908',
          name: 'PowerShell Script Block Logged',
          risk_score: 21,
          rule_id: '80f6561c-17d3-509b-a584-78c8232d4908',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Execution'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1059.001',
                  name: 'PowerShell',
                  reference: 'https://attack.mitre.org/techniques/T1059/001',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1059.001',
            name: 'PowerShell',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'priya_kapoor',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T03:19:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '492d98d6-7130-4f1a-b5dd-2095bae28845',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-marketing-04',
        ip: ['10.42.20.55'],
        name: 'ws-marketing-04',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: 'b5ec577b-6ede-40fd-b780-d7c67271eef4',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '6276f7af-e58f-4186-bf9f-5668f5cc1e73',
          },
          intended_timestamp: '2026-10-02T03:19:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T03:19:03.000Z',
          reason: 'A PowerShell command was logged via ScriptBlockLogging.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A PowerShell command was logged via ScriptBlockLogging.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'PowerShell Script Block Logged',
            parameters: {
              description: 'A PowerShell command was logged via ScriptBlockLogging.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '80f6561c-17d3-509b-a584-78c8232d4908',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Execution'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1059.001',
                    name: 'PowerShell',
                    reference: 'https://attack.mitre.org/techniques/T1059/001',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '80f6561c-17d3-509b-a584-78c8232d4908',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '6276f7af-e58f-4186-bf9f-5668f5cc1e73',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T03:19:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: 'powershell.exe -ExecutionPolicy Bypass -File C:\\scripts\\maintenance.ps1',
        name: 'powershell.exe',
        pid: 8149,
      },
      signal: {
        original_time: '2026-10-02T03:19:03.000Z',
        rule: {
          description: 'A PowerShell command was logged via ScriptBlockLogging.',
          id: '80f6561c-17d3-509b-a584-78c8232d4908',
          name: 'PowerShell Script Block Logged',
          risk_score: 21,
          rule_id: '80f6561c-17d3-509b-a584-78c8232d4908',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Execution'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1059.001',
                  name: 'PowerShell',
                  reference: 'https://attack.mitre.org/techniques/T1059/001',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1059.001',
            name: 'PowerShell',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'priya_kapoor',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T15:38:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '7f2d0fea-c25f-42fe-a38d-53442002fc39',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-marketing-04',
        ip: ['10.42.20.55'],
        name: 'ws-marketing-04',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '80734785-6292-4250-a072-44c3e06880e6',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '62ae57ec-05ec-4e43-8829-d20d19c236a6',
          },
          intended_timestamp: '2026-10-02T15:38:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T15:38:03.000Z',
          reason: 'Active Directory GPO was modified.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'Active Directory GPO was modified.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Group Policy Object Modified',
            parameters: {
              description: 'Active Directory GPO was modified.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Audit'],
            to: 'now',
            uuid: '2ab3f502-408e-53ed-8309-0bc3373a4626',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '62ae57ec-05ec-4e43-8829-d20d19c236a6',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T15:38:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T15:38:03.000Z',
        rule: {
          description: 'Active Directory GPO was modified.',
          id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
          name: 'Group Policy Object Modified',
          risk_score: 21,
          rule_id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Audit'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'marcus_chen',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T11:23:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '5a76c0a9-64d4-4755-b565-904c5f73b167',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-eng-19',
        ip: ['10.42.20.91'],
        name: 'ws-eng-19',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '954e9379-63e0-4b74-987d-7b8820b7a9dd',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '52e70ad5-135b-4c8d-8380-d15ba4cda758',
          },
          intended_timestamp: '2026-10-02T11:23:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T11:23:03.000Z',
          reason: 'Windows Defender flagged a PUA bundle on a workstation.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'Windows Defender flagged a PUA bundle on a workstation.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Windows Defender Detected Potentially Unwanted Application',
            parameters: {
              description: 'Windows Defender flagged a PUA bundle on a workstation.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: 'b9886131-34bd-5623-9e5d-f256ca579c38',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Defender'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0001',
                  name: 'Initial Access',
                  reference: 'https://attack.mitre.org/tactics/TA0001/',
                },
                technique: [
                  {
                    id: 'T1566',
                    name: 'Phishing',
                    reference: 'https://attack.mitre.org/techniques/T1566',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: 'b9886131-34bd-5623-9e5d-f256ca579c38',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '52e70ad5-135b-4c8d-8380-d15ba4cda758',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T11:23:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T11:23:03.000Z',
        rule: {
          description: 'Windows Defender flagged a PUA bundle on a workstation.',
          id: 'b9886131-34bd-5623-9e5d-f256ca579c38',
          name: 'Windows Defender Detected Potentially Unwanted Application',
          risk_score: 21,
          rule_id: 'b9886131-34bd-5623-9e5d-f256ca579c38',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Defender'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0001',
                name: 'Initial Access',
                reference: 'https://attack.mitre.org/tactics/TA0001/',
              },
              technique: [
                {
                  id: 'T1566',
                  name: 'Phishing',
                  reference: 'https://attack.mitre.org/techniques/T1566',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1566',
            name: 'Phishing',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T16:07:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '558d3c10-6b94-4138-95cc-de22f7dcce56',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-db-staging-01',
        ip: ['10.42.18.42'],
        name: 'srv-db-staging-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '8f0b4253-a016-4a73-9be5-3c6c94d6cc4e',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '7a9c1913-a1cb-4b07-83d5-d65d1f3dc1e4',
          },
          intended_timestamp: '2026-10-02T16:07:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T16:07:03.000Z',
          reason: 'Active Directory GPO was modified.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'Active Directory GPO was modified.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Group Policy Object Modified',
            parameters: {
              description: 'Active Directory GPO was modified.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Audit'],
            to: 'now',
            uuid: '2ab3f502-408e-53ed-8309-0bc3373a4626',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '7a9c1913-a1cb-4b07-83d5-d65d1f3dc1e4',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T16:07:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T16:07:03.000Z',
        rule: {
          description: 'Active Directory GPO was modified.',
          id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
          name: 'Group Policy Object Modified',
          risk_score: 21,
          rule_id: '2ab3f502-408e-53ed-8309-0bc3373a4626',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Audit'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'marcus_chen',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T12:36:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'c42cb61d-86f2-4949-9731-854b0810d2ba',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-sales-07',
        ip: ['10.42.20.63'],
        name: 'ws-sales-07',
        os: {
          family: 'windows',
          name: 'Windows 10',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '9ccf109a-9336-4699-9ac4-6a0f2d57abc3',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '45557fe0-6a33-468d-bb46-0a344ec7211b',
          },
          intended_timestamp: '2026-10-02T12:36:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T12:36:03.000Z',
          reason: 'A SIEM detection rule was modified by an administrator.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A SIEM detection rule was modified by an administrator.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Detection Rule Modified',
            parameters: {
              description: 'A SIEM detection rule was modified by an administrator.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: 'bd83da67-bde6-5423-a4e1-f1f6cc0ee25a',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Audit'],
            to: 'now',
            uuid: 'bd83da67-bde6-5423-a4e1-f1f6cc0ee25a',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '45557fe0-6a33-468d-bb46-0a344ec7211b',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T12:36:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T12:36:03.000Z',
        rule: {
          description: 'A SIEM detection rule was modified by an administrator.',
          id: 'bd83da67-bde6-5423-a4e1-f1f6cc0ee25a',
          name: 'Detection Rule Modified',
          risk_score: 21,
          rule_id: 'bd83da67-bde6-5423-a4e1-f1f6cc0ee25a',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Audit'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T03:57:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: 'd6daecb5-af8e-405f-98a5-a41096936ff1',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-marketing-04',
        ip: ['10.42.20.55'],
        name: 'ws-marketing-04',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '1cfc723b-2983-4451-a82d-5a546fcbdbb6',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'a574984d-ba35-442e-8ff9-4ac714de9b26',
          },
          intended_timestamp: '2026-10-02T03:57:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T03:57:03.000Z',
          reason: 'A new scheduled task was created via schtasks.exe.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A new scheduled task was created via schtasks.exe.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Scheduled Task Created',
            parameters: {
              description: 'A new scheduled task was created via schtasks.exe.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Execution'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1053.005',
                    name: 'Scheduled Task',
                    reference: 'https://attack.mitre.org/techniques/T1053/005',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '8b71460d-e651-5918-a26d-230e55e877f9',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: 'a574984d-ba35-442e-8ff9-4ac714de9b26',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T03:57:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: 'schtasks.exe /create /sc daily /tn BackupTask /tr C:\\backup\\run.cmd',
        name: 'schtasks.exe',
        pid: 7534,
      },
      signal: {
        original_time: '2026-10-02T03:57:03.000Z',
        rule: {
          description: 'A new scheduled task was created via schtasks.exe.',
          id: '8b71460d-e651-5918-a26d-230e55e877f9',
          name: 'Scheduled Task Created',
          risk_score: 21,
          rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Execution'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1053.005',
                  name: 'Scheduled Task',
                  reference: 'https://attack.mitre.org/techniques/T1053/005',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1053.005',
            name: 'Scheduled Task',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'service_backup',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T10:50:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '5710e276-3af4-4974-97b7-3d691774c28f',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-app-prod-03',
        ip: ['10.42.18.30'],
        name: 'srv-app-prod-03',
        os: {
          family: 'windows',
          name: 'Windows Server 2019',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '33b3067d-c56b-43c7-9aae-470b9c1802e0',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: 'd1a87f39-a078-4cde-a3a5-8c0348f43e10',
          },
          intended_timestamp: '2026-10-02T10:50:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T10:50:03.000Z',
          reason: 'A new scheduled task was created via schtasks.exe.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A new scheduled task was created via schtasks.exe.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Scheduled Task Created',
            parameters: {
              description: 'A new scheduled task was created via schtasks.exe.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Execution'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1053.005',
                    name: 'Scheduled Task',
                    reference: 'https://attack.mitre.org/techniques/T1053/005',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '8b71460d-e651-5918-a26d-230e55e877f9',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: 'd1a87f39-a078-4cde-a3a5-8c0348f43e10',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T10:50:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: 'schtasks.exe /create /sc daily /tn BackupTask /tr C:\\backup\\run.cmd',
        name: 'schtasks.exe',
        pid: 6744,
      },
      signal: {
        original_time: '2026-10-02T10:50:03.000Z',
        rule: {
          description: 'A new scheduled task was created via schtasks.exe.',
          id: '8b71460d-e651-5918-a26d-230e55e877f9',
          name: 'Scheduled Task Created',
          risk_score: 21,
          rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Execution'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1053.005',
                  name: 'Scheduled Task',
                  reference: 'https://attack.mitre.org/techniques/T1053/005',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1053.005',
            name: 'Scheduled Task',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'service_backup',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T02:12:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '54c484cd-4c93-4733-bd99-46dcaef53168',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'srv-db-staging-01',
        ip: ['10.42.18.42'],
        name: 'srv-db-staging-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: 'fdb1d55d-7dfb-4462-9472-1d7ca5d427de',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '4b373f9c-a63b-4d5c-99d1-61aee4b8ed85',
          },
          intended_timestamp: '2026-10-02T02:12:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T02:12:03.000Z',
          reason: 'Defender failed to update its signature database within the expected window.',
          risk_score: 14,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description:
              'Defender failed to update its signature database within the expected window.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Windows Defender Signature Update Failed',
            parameters: {
              description:
                'Defender failed to update its signature database within the expected window.',
              risk_score: 14,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 14,
            rule_id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Defender'],
            to: 'now',
            uuid: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '4b373f9c-a63b-4d5c-99d1-61aee4b8ed85',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T02:12:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      signal: {
        original_time: '2026-10-02T02:12:03.000Z',
        rule: {
          description:
            'Defender failed to update its signature database within the expected window.',
          id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
          name: 'Windows Defender Signature Update Failed',
          risk_score: 14,
          rule_id: '8b8a8768-9807-5f7e-a167-7fba8088b0ce',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Defender'],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T22:35:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '19f1b9e0-ab47-4e27-aeaa-c7bc216c92bc',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-finance-12',
        ip: ['10.42.20.78'],
        name: 'ws-finance-12',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '7dd35eb5-36ce-4e38-bd27-d079e66d3076',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '9284b269-9784-4f33-984e-e0ab3664d50a',
          },
          intended_timestamp: '2026-10-01T22:35:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-01T22:35:03.000Z',
          reason: 'A new scheduled task was created via schtasks.exe.',
          risk_score: 21,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'A new scheduled task was created via schtasks.exe.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Scheduled Task Created',
            parameters: {
              description: 'A new scheduled task was created via schtasks.exe.',
              risk_score: 21,
              severity: 'low',
            },
            producer: 'siem',
            references: [],
            risk_score: 21,
            rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
            rule_type_id: 'siem.queryRule',
            severity: 'low',
            tags: ['Noise: Unrelated', 'Category: Execution'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0002',
                  name: 'Execution',
                  reference: 'https://attack.mitre.org/tactics/TA0002/',
                },
                technique: [
                  {
                    id: 'T1053.005',
                    name: 'Scheduled Task',
                    reference: 'https://attack.mitre.org/techniques/T1053/005',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '8b71460d-e651-5918-a26d-230e55e877f9',
            version: 1,
          },
          severity: 'low',
          status: 'active',
          url: '',
          uuid: '9284b269-9784-4f33-984e-e0ab3664d50a',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-01T22:35:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        command_line: 'schtasks.exe /create /sc daily /tn BackupTask /tr C:\\backup\\run.cmd',
        name: 'schtasks.exe',
        pid: 4822,
      },
      signal: {
        original_time: '2026-10-01T22:35:03.000Z',
        rule: {
          description: 'A new scheduled task was created via schtasks.exe.',
          id: '8b71460d-e651-5918-a26d-230e55e877f9',
          name: 'Scheduled Task Created',
          risk_score: 21,
          rule_id: '8b71460d-e651-5918-a26d-230e55e877f9',
          severity: 'low',
          tags: ['Noise: Unrelated', 'Category: Execution'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0002',
                name: 'Execution',
                reference: 'https://attack.mitre.org/tactics/TA0002/',
              },
              technique: [
                {
                  id: 'T1053.005',
                  name: 'Scheduled Task',
                  reference: 'https://attack.mitre.org/techniques/T1053/005',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1053.005',
            name: 'Scheduled Task',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T13:55:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['intrusion_detection'],
        id: '9418cd45-1c16-481b-bbba-c57e40c09d5e',
        kind: 'signal',
        module: 'endpoint',
      },
      host: {
        hostname: 'ws-marketing-04',
        ip: ['10.42.20.55'],
        name: 'ws-marketing-04',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      kibana: {
        alert: {
          ancestors: [
            {
              depth: 0,
              id: '517ba6e7-a7e3-4254-a033-e9b3e61d7d87',
              index: 'logs-endpoint.events.process-default',
              type: 'event',
            },
          ],
          depth: 1,
          instance: {
            id: '2cdf8277-61e4-484c-be3d-dd1f109d9720',
          },
          intended_timestamp: '2026-10-02T13:55:03.000Z',
          original_event: {
            category: ['process'],
            kind: 'event',
            type: ['start'],
          },
          original_time: '2026-10-02T13:55:03.000Z',
          reason: 'More than 5 failed logon attempts for a single account in 10 minutes.',
          risk_score: 47,
          rule: {
            actions: [],
            author: ['Elastic'],
            category: 'Custom Query Rule',
            consumer: 'siem',
            description: 'More than 5 failed logon attempts for a single account in 10 minutes.',
            enabled: true,
            exceptions_list: [],
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            license: 'Elastic License v2',
            max_signals: 100,
            name: 'Multiple Failed Logon Attempts',
            parameters: {
              description: 'More than 5 failed logon attempts for a single account in 10 minutes.',
              risk_score: 47,
              severity: 'medium',
            },
            producer: 'siem',
            references: [],
            risk_score: 47,
            rule_id: '7852c135-a909-5319-a7de-9e1e071eab9c',
            rule_type_id: 'siem.queryRule',
            severity: 'medium',
            tags: ['Noise: Unrelated', 'Category: Authentication'],
            threat: [
              {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: 'TA0006',
                  name: 'Credential Access',
                  reference: 'https://attack.mitre.org/tactics/TA0006/',
                },
                technique: [
                  {
                    id: 'T1110.001',
                    name: 'Brute Force: Password Guessing',
                    reference: 'https://attack.mitre.org/techniques/T1110/001',
                  },
                ],
              },
            ],
            to: 'now',
            uuid: '7852c135-a909-5319-a7de-9e1e071eab9c',
            version: 1,
          },
          severity: 'medium',
          status: 'active',
          url: '',
          uuid: '2cdf8277-61e4-484c-be3d-dd1f109d9720',
          workflow_status: 'open',
          workflow_status_updated_at: '2026-10-02T13:55:03.000Z',
        },
        space_ids: ['default'],
        version: '8.18.0',
      },
      labels: {
        noise: true,
        simulation: 'chrysalis-sim',
      },
      process: {
        name: 'lsass.exe',
        pid: 696,
      },
      signal: {
        original_time: '2026-10-02T13:55:03.000Z',
        rule: {
          description: 'More than 5 failed logon attempts for a single account in 10 minutes.',
          id: '7852c135-a909-5319-a7de-9e1e071eab9c',
          name: 'Multiple Failed Logon Attempts',
          risk_score: 47,
          rule_id: '7852c135-a909-5319-a7de-9e1e071eab9c',
          severity: 'medium',
          tags: ['Noise: Unrelated', 'Category: Authentication'],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0006',
                name: 'Credential Access',
                reference: 'https://attack.mitre.org/tactics/TA0006/',
              },
              technique: [
                {
                  id: 'T1110.001',
                  name: 'Brute Force: Password Guessing',
                  reference: 'https://attack.mitre.org/techniques/T1110/001',
                },
              ],
            },
          ],
          type: 'query',
          version: 1,
        },
        status: 'open',
      },
      tags: ['chrysalis-sim'],
      threat: {
        technique: [
          {
            id: 'T1110.001',
            name: 'Brute Force: Password Guessing',
          },
        ],
      },
      user: {
        domain: 'CORP',
        name: 'marcus_chen',
      },
    },
    group: 'noise',
    index: 'logs-chrysalis-sim.alerts-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T12:48:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '64a9e9e0-7ec2-48e0-90d0-4e1f4499dad8',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\notepad++.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\notepad++.exe"',
        executable: 'C:\\Program Files\\Notepad++\\notepad++.exe',
        name: 'notepad++.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\explorer.exe',
          name: 'explorer.exe',
          pid: 642,
        },
        pid: 2526,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T13:41:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: 'cafceb1b-b721-4379-85b2-1a1393b7b303',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\System32\\svchost.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\System32\\svchost.exe"',
        executable: 'C:\\Windows\\System32\\svchost.exe',
        name: 'svchost.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\services.exe',
          name: 'services.exe',
          pid: 615,
        },
        pid: 7011,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T10:52:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '9588b578-832c-4416-afa2-e25ff96fb65b',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\explorer.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\explorer.exe"',
        executable: 'C:\\Windows\\explorer.exe',
        name: 'explorer.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\userinit.exe',
          name: 'userinit.exe',
          pid: 1432,
        },
        pid: 9040,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T05:14:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '677601dd-7b48-4351-9200-8f283f7c2354',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\System32\\svchost.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\System32\\svchost.exe"',
        executable: 'C:\\Windows\\System32\\svchost.exe',
        name: 'svchost.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\services.exe',
          name: 'services.exe',
          pid: 846,
        },
        pid: 7649,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T00:41:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '22b9d02a-2c2b-4fc7-82de-ed938b63fecc',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\explorer.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\explorer.exe"',
        executable: 'C:\\Windows\\explorer.exe',
        name: 'explorer.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\userinit.exe',
          name: 'userinit.exe',
          pid: 1147,
        },
        pid: 1047,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T07:21:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '821648e6-c294-4483-95f2-5c56d251d7e5',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\updater\\GUP.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\updater\\GUP.exe"',
        executable: 'C:\\Program Files\\Notepad++\\updater\\GUP.exe',
        name: 'GUP.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\notepad++.exe',
          name: 'notepad++.exe',
          pid: 1156,
        },
        pid: 3915,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T00:32:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '19c9acce-dd70-40bf-b484-4640383c5c07',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\notepad++.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\notepad++.exe"',
        executable: 'C:\\Program Files\\Notepad++\\notepad++.exe',
        name: 'notepad++.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\explorer.exe',
          name: 'explorer.exe',
          pid: 1072,
        },
        pid: 7570,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T20:04:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: 'a9829337-f91f-4efc-8321-7284e8c2a798',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\notepad++.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\notepad++.exe"',
        executable: 'C:\\Program Files\\Notepad++\\notepad++.exe',
        name: 'notepad++.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\explorer.exe',
          name: 'explorer.exe',
          pid: 735,
        },
        pid: 1311,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T08:47:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '091e4929-2206-42ca-bb00-1d9eeb6d578a',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\notepad++.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\notepad++.exe"',
        executable: 'C:\\Program Files\\Notepad++\\notepad++.exe',
        name: 'notepad++.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\explorer.exe',
          name: 'explorer.exe',
          pid: 1425,
        },
        pid: 5967,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T06:06:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '37171d2c-ca1f-46a6-bd59-386523a1b7a7',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\explorer.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\explorer.exe"',
        executable: 'C:\\Windows\\explorer.exe',
        name: 'explorer.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\userinit.exe',
          name: 'userinit.exe',
          pid: 1066,
        },
        pid: 7830,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T09:52:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '6eb92807-2ea2-471a-b953-9882e003edae',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\explorer.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\explorer.exe"',
        executable: 'C:\\Windows\\explorer.exe',
        name: 'explorer.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\userinit.exe',
          name: 'userinit.exe',
          pid: 1391,
        },
        pid: 1991,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T04:55:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: 'd6d8648d-0eb3-438f-98ff-0c21fd6ade80',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\updater\\GUP.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\updater\\GUP.exe"',
        executable: 'C:\\Program Files\\Notepad++\\updater\\GUP.exe',
        name: 'GUP.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\notepad++.exe',
          name: 'notepad++.exe',
          pid: 830,
        },
        pid: 7446,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T10:00:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '7603c389-363f-45e5-8755-cde68d90501a',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\System32\\svchost.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\System32\\svchost.exe"',
        executable: 'C:\\Windows\\System32\\svchost.exe',
        name: 'svchost.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\services.exe',
          name: 'services.exe',
          pid: 908,
        },
        pid: 7153,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T14:00:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: 'f95657ba-477b-48a1-82cd-c91459bc681a',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\notepad++.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\notepad++.exe"',
        executable: 'C:\\Program Files\\Notepad++\\notepad++.exe',
        name: 'notepad++.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\explorer.exe',
          name: 'explorer.exe',
          pid: 1037,
        },
        pid: 8639,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T20:11:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '1cdcb0f7-0576-43de-b3b5-aa9a18bd92b1',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\System32\\svchost.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\System32\\svchost.exe"',
        executable: 'C:\\Windows\\System32\\svchost.exe',
        name: 'svchost.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\services.exe',
          name: 'services.exe',
          pid: 1364,
        },
        pid: 5508,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T11:00:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: 'eb3f6afa-ccc2-489e-b63c-958ca108eba0',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\notepad++.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\notepad++.exe"',
        executable: 'C:\\Program Files\\Notepad++\\notepad++.exe',
        name: 'notepad++.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\explorer.exe',
          name: 'explorer.exe',
          pid: 1341,
        },
        pid: 9807,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T19:53:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '654e0337-9b80-4960-9f7b-6d914c90c448',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\updater\\GUP.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\updater\\GUP.exe"',
        executable: 'C:\\Program Files\\Notepad++\\updater\\GUP.exe',
        name: 'GUP.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\notepad++.exe',
          name: 'notepad++.exe',
          pid: 777,
        },
        pid: 4073,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T15:38:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: 'bfda006d-748f-4ea9-a3cd-49eee4c49c50',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\explorer.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\explorer.exe"',
        executable: 'C:\\Windows\\explorer.exe',
        name: 'explorer.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\userinit.exe',
          name: 'userinit.exe',
          pid: 1351,
        },
        pid: 4110,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T14:08:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '23dd68a3-73a5-4287-bc1d-e586bfbd08a4',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Program', 'Files\\Notepad++\\notepad++.exe"'],
        args_count: 2,
        command_line: '"C:\\Program Files\\Notepad++\\notepad++.exe"',
        executable: 'C:\\Program Files\\Notepad++\\notepad++.exe',
        name: 'notepad++.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\explorer.exe',
          name: 'explorer.exe',
          pid: 1096,
        },
        pid: 5791,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T10:32:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.process',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'process_start',
        category: ['process'],
        dataset: 'endpoint.events.process',
        id: '017b0a24-da29-4023-b697-af5baba29d30',
        kind: 'event',
        module: 'endpoint',
        type: ['start'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-win-defend-01',
        ip: ['10.42.18.27'],
        name: 'srv-win-defend-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
          version: '10.0.20348',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      process: {
        args: ['"C:\\Windows\\explorer.exe"'],
        args_count: 1,
        command_line: '"C:\\Windows\\explorer.exe"',
        executable: 'C:\\Windows\\explorer.exe',
        name: 'explorer.exe',
        parent: {
          executable: 'C:\\Windows\\System32\\userinit.exe',
          name: 'userinit.exe',
          pid: 773,
        },
        pid: 1582,
      },
      tags: ['chrysalis-sim'],
      user: {
        domain: 'CORP',
        id: 'S-1-5-21-1004336348-1177238915-682003330-1132',
        name: 'james_spiteri',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.process-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T01:16:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'google.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: 'cdaf4a66-488f-46d1-84ce-d1b321d00111',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'ws-eng-19',
        ip: ['10.42.20.91'],
        name: 'ws-eng-19',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 6839,
      },
      source: {
        bytes: 512,
        ip: '10.42.20.91',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'google.com',
      },
      user: {
        domain: 'CORP',
        name: 'marcus_chen',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T20:12:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'google.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '210f439d-ac6c-450c-96c5-bcb28f2057cd',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'ws-sales-07',
        ip: ['10.42.20.63'],
        name: 'ws-sales-07',
        os: {
          family: 'windows',
          name: 'Windows 10',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 3906,
      },
      source: {
        bytes: 512,
        ip: '10.42.20.63',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'google.com',
      },
      user: {
        domain: 'CORP',
        name: 'priya_kapoor',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T13:59:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'graph.microsoft.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '3d9e6665-a32d-47c7-87f4-7e8f3b409618',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-fileshare-02',
        ip: ['10.42.18.51'],
        name: 'srv-fileshare-02',
        os: {
          family: 'windows',
          name: 'Windows Server 2019',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 2713,
      },
      source: {
        bytes: 512,
        ip: '10.42.18.51',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'graph.microsoft.com',
      },
      user: {
        domain: 'CORP',
        name: 'priya_kapoor',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T15:52:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'windowsupdate.microsoft.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '14be9e49-7b98-4ec8-ad57-bd22e6a77fda',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'ws-finance-12',
        ip: ['10.42.20.78'],
        name: 'ws-finance-12',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 6983,
      },
      source: {
        bytes: 512,
        ip: '10.42.20.78',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'windowsupdate.microsoft.com',
      },
      user: {
        domain: 'CORP',
        name: 'marcus_chen',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T00:52:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'www.microsoft.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '544a58d4-2227-4a74-a022-8c1d7d9a150b',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-app-prod-03',
        ip: ['10.42.18.30'],
        name: 'srv-app-prod-03',
        os: {
          family: 'windows',
          name: 'Windows Server 2019',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 8284,
      },
      source: {
        bytes: 512,
        ip: '10.42.18.30',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'www.microsoft.com',
      },
      user: {
        domain: 'CORP',
        name: 'priya_kapoor',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T15:45:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'github.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '53f56694-fdf6-4623-bcf4-b0d742b22e09',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'ws-finance-12',
        ip: ['10.42.20.78'],
        name: 'ws-finance-12',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 3732,
      },
      source: {
        bytes: 512,
        ip: '10.42.20.78',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'github.com',
      },
      user: {
        domain: 'CORP',
        name: 'service_backup',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T11:01:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'google.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '9da87f82-00f2-4ea5-9590-6efae10fecf5',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'ws-marketing-04',
        ip: ['10.42.20.55'],
        name: 'ws-marketing-04',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 7136,
      },
      source: {
        bytes: 512,
        ip: '10.42.20.55',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'google.com',
      },
      user: {
        domain: 'CORP',
        name: 'admin_helpdesk',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T08:07:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'graph.microsoft.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '310b3fdc-6f8e-491e-affc-b5f181a73c3d',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'ws-eng-19',
        ip: ['10.42.20.91'],
        name: 'ws-eng-19',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 6198,
      },
      source: {
        bytes: 512,
        ip: '10.42.20.91',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'graph.microsoft.com',
      },
      user: {
        domain: 'CORP',
        name: 'service_backup',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T15:38:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'www.microsoft.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: 'a50f8ba5-b8cd-4042-89f0-39bc40d34de6',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'ws-eng-19',
        ip: ['10.42.20.91'],
        name: 'ws-eng-19',
        os: {
          family: 'windows',
          name: 'Windows 11',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 6317,
      },
      source: {
        bytes: 512,
        ip: '10.42.20.91',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'www.microsoft.com',
      },
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T23:31:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'github.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '2e7474fa-0248-491a-b8d8-02f90fd1ca9d',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-db-staging-01',
        ip: ['10.42.18.42'],
        name: 'srv-db-staging-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 5006,
      },
      source: {
        bytes: 512,
        ip: '10.42.18.42',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'github.com',
      },
      user: {
        domain: 'CORP',
        name: 'admin_helpdesk',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T19:59:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'www.microsoft.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: 'f4b69441-65b8-4099-9a40-d231daa5c99b',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'ws-sales-07',
        ip: ['10.42.20.63'],
        name: 'ws-sales-07',
        os: {
          family: 'windows',
          name: 'Windows 10',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 8074,
      },
      source: {
        bytes: 512,
        ip: '10.42.20.63',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'www.microsoft.com',
      },
      user: {
        domain: 'CORP',
        name: 'service_backup',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T22:18:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'github.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: 'ca009286-f7ce-4d55-bb05-faa371f47490',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-fileshare-02',
        ip: ['10.42.18.51'],
        name: 'srv-fileshare-02',
        os: {
          family: 'windows',
          name: 'Windows Server 2019',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 6145,
      },
      source: {
        bytes: 512,
        ip: '10.42.18.51',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'github.com',
      },
      user: {
        domain: 'CORP',
        name: 'marcus_chen',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T14:37:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'windowsupdate.microsoft.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '4cf5d8ba-9483-4cb1-a6db-ec02fe04a15e',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-db-staging-01',
        ip: ['10.42.18.42'],
        name: 'srv-db-staging-01',
        os: {
          family: 'windows',
          name: 'Windows Server 2022',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 4466,
      },
      source: {
        bytes: 512,
        ip: '10.42.18.42',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'windowsupdate.microsoft.com',
      },
      user: {
        domain: 'CORP',
        name: 'marcus_chen',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T19:21:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'google.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '8631885d-63a9-4768-af9d-947007892936',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-fileshare-02',
        ip: ['10.42.18.51'],
        name: 'srv-fileshare-02',
        os: {
          family: 'windows',
          name: 'Windows Server 2019',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 2021,
      },
      source: {
        bytes: 512,
        ip: '10.42.18.51',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'google.com',
      },
      user: {
        domain: 'CORP',
        name: 'priya_kapoor',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-01T20:17:03.000Z',
      agent: {
        id: 'chrysalis-sim-agent',
        type: 'endpoint',
        version: '8.18.0',
      },
      data_stream: {
        dataset: 'endpoint.events.network',
        namespace: 'default',
        type: 'logs',
      },
      destination: {
        bytes: 1024,
        domain: 'windowsupdate.microsoft.com',
        ip: '20.42.65.84',
        port: 443,
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        action: 'connection_attempted',
        category: ['network'],
        dataset: 'endpoint.events.network',
        id: '45b6bf0d-c05d-47b1-835a-20cc0329a89c',
        kind: 'event',
        module: 'endpoint',
        outcome: 'success',
        type: ['connection'],
      },
      host: {
        architecture: 'x86_64',
        hostname: 'srv-app-prod-03',
        ip: ['10.42.18.30'],
        name: 'srv-app-prod-03',
        os: {
          family: 'windows',
          name: 'Windows Server 2019',
          platform: 'windows',
        },
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      network: {
        bytes: 1536,
        direction: 'outbound',
        protocol: 'https',
        transport: 'tcp',
      },
      process: {
        name: 'chrome.exe',
        pid: 3883,
      },
      source: {
        bytes: 512,
        ip: '10.42.18.30',
      },
      tags: ['chrysalis-sim'],
      url: {
        domain: 'windowsupdate.microsoft.com',
      },
      user: {
        domain: 'CORP',
        name: 'alice_thompson',
      },
    },
    group: 'supporting',
    index: 'logs-endpoint.events.network-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        dataset: 'ti_chrysalis_sim.indicator',
        kind: 'enrichment',
        module: 'ti_chrysalis_sim',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description:
            'Chrysalis backdoor IOC: update.exe. Source: Rapid7 Labs threat report on Lotus Blossom / Chrysalis (Feb 2026).',
          file: {
            hash: {
              sha256: 'a511be5164dc1122fb5a7daa3eef9467e43d8458425b15a640235796006590c9',
            },
            name: 'update.exe',
          },
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'file',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        dataset: 'ti_chrysalis_sim.indicator',
        kind: 'enrichment',
        module: 'ti_chrysalis_sim',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description:
            'Chrysalis backdoor IOC: [NSIS].nsi. Source: Rapid7 Labs threat report on Lotus Blossom / Chrysalis (Feb 2026).',
          file: {
            hash: {
              sha256: '8ea8b83645fba6e23d48075a0d3fc73ad2ba515b4536710cda4f1f232718f53e',
            },
            name: '[NSIS].nsi',
          },
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'file',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        dataset: 'ti_chrysalis_sim.indicator',
        kind: 'enrichment',
        module: 'ti_chrysalis_sim',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description:
            'Chrysalis backdoor IOC: BluetoothService.exe. Source: Rapid7 Labs threat report on Lotus Blossom / Chrysalis (Feb 2026).',
          file: {
            hash: {
              sha256: '2da00de67720f5f13b17e9d985fe70f10f153da60c9ab1086fe58f069a156924',
            },
            name: 'BluetoothService.exe',
          },
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'file',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        dataset: 'ti_chrysalis_sim.indicator',
        kind: 'enrichment',
        module: 'ti_chrysalis_sim',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description:
            'Chrysalis backdoor IOC: BluetoothService. Source: Rapid7 Labs threat report on Lotus Blossom / Chrysalis (Feb 2026).',
          file: {
            hash: {
              sha256: '77bfea78def679aa1117f569a35e8fd1542df21f7e00e27f192c907e61d63a2e',
            },
            name: 'BluetoothService',
          },
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'file',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        dataset: 'ti_chrysalis_sim.indicator',
        kind: 'enrichment',
        module: 'ti_chrysalis_sim',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description:
            'Chrysalis backdoor IOC: log.dll. Source: Rapid7 Labs threat report on Lotus Blossom / Chrysalis (Feb 2026).',
          file: {
            hash: {
              sha256: '3bdc4c0637591533f1d4198a72a33426c01f69bd2e15ceee547866f65e26b7ad',
            },
            name: 'log.dll',
          },
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'file',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        dataset: 'ti_chrysalis_sim.indicator',
        kind: 'enrichment',
        module: 'ti_chrysalis_sim',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description:
            'Chrysalis backdoor IOC: u.bat. Source: Rapid7 Labs threat report on Lotus Blossom / Chrysalis (Feb 2026).',
          file: {
            hash: {
              sha256: '9276594e73cda1c69b7d265b3f08dc8fa84bf2d6599086b9acc0bb3745146600',
            },
            name: 'u.bat',
          },
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'file',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        dataset: 'ti_chrysalis_sim.indicator',
        kind: 'enrichment',
        module: 'ti_chrysalis_sim',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description:
            'Chrysalis backdoor IOC: conf.c. Source: Rapid7 Labs threat report on Lotus Blossom / Chrysalis (Feb 2026).',
          file: {
            hash: {
              sha256: 'f4d829739f2d6ba7e3ede83dad428a0ced1a703ec582fc73a4eee3df3704629a',
            },
            name: 'conf.c',
          },
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'file',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        dataset: 'ti_chrysalis_sim.indicator',
        kind: 'enrichment',
        module: 'ti_chrysalis_sim',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description:
            'Chrysalis backdoor IOC: libtcc.dll. Source: Rapid7 Labs threat report on Lotus Blossom / Chrysalis (Feb 2026).',
          file: {
            hash: {
              sha256: '4a52570eeaf9d27722377865df312e295a7a23c3b6eb991944c2ecd707cc9906',
            },
            name: 'libtcc.dll',
          },
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'file',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        dataset: 'ti_chrysalis_sim.indicator',
        kind: 'enrichment',
        module: 'ti_chrysalis_sim',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description:
            'Chrysalis backdoor IOC: ConsoleApplication2.exe. Source: Rapid7 Labs threat report on Lotus Blossom / Chrysalis (Feb 2026).',
          file: {
            hash: {
              sha256: 'b4169a831292e245ebdffedd5820584d73b129411546e7d3eccf4663d5fc5be3',
            },
            name: 'ConsoleApplication2.exe',
          },
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'file',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        kind: 'enrichment',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description: 'Chrysalis C2 domain (Lotus Blossom): api.skycloudcenter.com',
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'domain-name',
          url: {
            domain: 'api.skycloudcenter.com',
          },
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        kind: 'enrichment',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'High',
          description: 'Chrysalis C2 domain (Lotus Blossom): api.wiresguard.com',
          first_seen: '2026-06-04T19:17:03.000Z',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'domain-name',
          url: {
            domain: 'api.wiresguard.com',
          },
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        kind: 'enrichment',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'Medium',
          description: 'Chrysalis-related infrastructure IP: 95.179.213.0',
          first_seen: '2026-06-04T19:17:03.000Z',
          ip: '95.179.213.0',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'ipv4-addr',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        kind: 'enrichment',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'Medium',
          description: 'Chrysalis-related infrastructure IP: 61.4.102.97',
          first_seen: '2026-06-04T19:17:03.000Z',
          ip: '61.4.102.97',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'ipv4-addr',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        kind: 'enrichment',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'Medium',
          description: 'Chrysalis-related infrastructure IP: 59.110.7.32',
          first_seen: '2026-06-04T19:17:03.000Z',
          ip: '59.110.7.32',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'ipv4-addr',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      data_stream: {
        dataset: 'ti_chrysalis_sim',
        namespace: 'default',
        type: 'logs',
      },
      ecs: {
        version: '8.11.0',
      },
      event: {
        category: ['threat'],
        kind: 'enrichment',
        provider: 'Rapid7 Labs (synthetic ingest)',
        type: ['indicator'],
      },
      labels: {
        simulation: 'chrysalis-sim',
      },
      tags: ['chrysalis-sim'],
      threat: {
        indicator: {
          confidence: 'Medium',
          description: 'Chrysalis-related infrastructure IP: 124.222.137.114',
          first_seen: '2026-06-04T19:17:03.000Z',
          ip: '124.222.137.114',
          last_seen: '2026-10-02T19:17:03.000Z',
          marking: {
            tlp: 'WHITE',
          },
          provider: 'Rapid7 Labs',
          type: 'ipv4-addr',
        },
      },
    },
    group: 'threat_intel',
    index: 'logs-ti_chrysalis_sim-default',
  },
  {
    doc: {
      '@timestamp': '2026-10-02T19:17:03.000Z',
      labels: {
        simulation: 'chrysalis-sim',
      },
      responder: {
        email: 'priya.kapoor@example.corp',
        name: 'Priya Kapoor',
        phone: '+1-555-0142',
        slack_handle: '@priya.kapoor',
        team: 'SOC Tier 2',
      },
      rotation: 'soc-tier-2-primary',
      shift_end: '2026-10-03T01:17:03.000Z',
      shift_start: '2026-10-02T17:17:03.000Z',
      tags: ['chrysalis-sim'],
    },
    group: 'on_call',
    index: 'on-call-schedule',
  },
];
