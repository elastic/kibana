/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryFindResponse } from '@kbn/elastic-assistant-common';

export const getMockAttackDiscoveryFindResponse = (): AttackDiscoveryFindResponse => ({
  connector_names: ['Claude Sonnet 3.5', 'GPT-4.1', 'GPT-4o'],
  data: [
    {
      alert_ids: [
        '14bd5f2a3839278e467dcdd31de5d74a80315a86625f8c87917f76652132ff2e',
        'cbec85fa2f911a9711cc76d0ab4b65d327e08d1a4afab530120fd1d402834013',
        'f049cb9a261d34e037bb2abbc67eec8a99388d9fc3586d500f4e214d26699705',
        '61073bf3467ada541ad6605e27021ba9abe437ce2ae958e680c9935ffd3fcbf0',
        '05d7f602c6f44f7943e17e9f7a6c3b20ec5583c07f8c2ae55395b91e729e2a0a',
      ],
      alert_rule_uuid: 'attack_discovery_ad_hoc_rule_id',
      alert_start: '2025-06-27T17:06:07.163Z',
      alert_updated_at: '2025-06-27T17:13:33.318Z',
      alert_workflow_status: 'open',
      alert_workflow_status_updated_at: '2025-06-27T17:13:33.318Z',
      connector_id: 'gpt41Azure',
      connector_name: 'GPT-4.1',
      details_markdown:
        '- On {{ host.name 8f66d5b8-595e-4189-bfce-6541f81f4477 }}, user {{ user.name fb5924ec-2cfb-406d-a96d-4c2ea85fba36 }} opened a malicious Word document ({{ process.parent.name WINWORD.EXE }}) which spawned {{ process.name wscript.exe }} to execute a suspicious VBS script ({{ file.name AppPool.vbs }}).\n- The script created a scheduled task to persistently execute itself and then launched {{ process.name powershell.exe }} with obfuscated arguments ({{ process.command_line "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -exec bypass -file ... }}).\n- The PowerShell script is indicative of command-and-control activity, likely connecting to an external server for further instructions or payloads.\n- The attack chain demonstrates initial access via phishing, execution of a script via LOLBins, persistence via scheduled tasks, and C2 via PowerShell, all on {{ host.name 8f66d5b8-595e-4189-bfce-6541f81f4477 }} by {{ user.name fb5924ec-2cfb-406d-a96d-4c2ea85fba36 }}.',
      entity_summary_markdown:
        'PowerShell C2 on {{ host.name 8f66d5b8-595e-4189-bfce-6541f81f4477 }} by {{ user.name fb5924ec-2cfb-406d-a96d-4c2ea85fba36 }}.',
      generation_uuid: 'bb09576f-60fb-4f05-8219-f1c796585021',
      id: '4986644a9ae68ce8e51cc5c26fd0bf573a1fca0cd1c43a09fe07d93e6cc79a49',
      mitre_attack_tactics: [
        'Initial Access',
        'Execution',
        'Persistence',
        'Command and Control',
        'Defense Evasion',
      ],
      replacements: {
        '639ad56e-d94f-44de-b92b-14ab77d8c65f': 'root',
        'c07f52c5-19b2-4eec-99ca-8f802acf97e4': 'SRVMAC08',
        '19931f1b-b438-41e4-b423-8c3030e81516': 'james',
        '8f66d5b8-595e-4189-bfce-6541f81f4477': 'SRVWIN07',
        'fb5924ec-2cfb-406d-a96d-4c2ea85fba36': 'Administrator',
        '2d3e3831-a0bc-445b-a926-effd9db5b364': 'SRVWIN06',
        '2270fcd6-8451-4c78-aaa2-8f9f229b2bce': 'SRVNIX05',
        '5e5442b3-fe79-4625-bfe0-9a53641a707f': 'SRVWIN04',
        '10d4f764-55f4-4d30-b024-2b725285f03e': 'SRVWIN03',
        '6ff109ee-17f0-48df-b799-3847bf426dca': 'SRVWIN02',
        'ec003e6b-7dd1-4905-8523-ce42525381da': 'SRVWIN01',
      },
      risk_score: 495,
      summary_markdown:
        'Office phishing led to persistent PowerShell C2 on {{ host.name 8f66d5b8-595e-4189-bfce-6541f81f4477 }} by {{ user.name fb5924ec-2cfb-406d-a96d-4c2ea85fba36 }}.',
      timestamp: '2025-06-27T17:06:07.163Z',
      title: 'Office phishing to PowerShell C2',
      user_id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      user_name: 'elastic',
      users: [
        {
          id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          name: 'elastic',
        },
      ],
    },
    {
      alert_ids: [
        '62779b19c70bc8c86809812f9787ef284117c87b50292c549b66d0dcb8a24834',
        'd8f622898b24c263fd0b0cfe0057ce4a3ca68931aa4753ecc8ecfc33909a754e',
        'e25cede2ca5bfb0480f29a2dae221d9ff29053a37466719dfdc6b97303ebf49b',
        '4b08dc0a7c2e68d4fb8eb7cb42bd75f6e1a313fae4923ef598710bab517b8ee5',
        '780e4b92328d90d24f89ad1a301e2b8dcfc101858c77d252e2bfdb60eb7d9b96',
        '7c3a173e6dd973af06b26eac30423167a51259d6ef816095157e524683e8e6a0',
        '91f8bf7df177cb3aeee0909335c12a683aee459e00fc5fd9074b454c24d6f09c',
        'dc109d0fc3d25fc9bdb179575d91996b5129770c8eb31511ce63c1564575272a',
      ],
      alert_rule_uuid: 'attack_discovery_ad_hoc_rule_id',
      alert_start: '2025-06-27T17:06:07.163Z',
      alert_updated_at: '2025-06-27T17:13:33.318Z',
      alert_workflow_status: 'open',
      alert_workflow_status_updated_at: '2025-06-27T17:13:33.318Z',
      connector_id: 'gpt41Azure',
      connector_name: 'GPT-4.1',
      details_markdown:
        "- On {{ host.name c07f52c5-19b2-4eec-99ca-8f802acf97e4 }}, user {{ user.name 19931f1b-b438-41e4-b423-8c3030e81516 }} was targeted by a phishing attack using a trojanized application ({{ file.name My Go Application.app }}) with a failed code signature ({{ process.code_signature.trusted false }}).\n- The application spawned {{ process.name osascript }} to display a fake password prompt ({{ process.args osascript -e display dialog ... }}), attempting to phish credentials.\n- The malware then used {{ process.name chmod }} to make a new binary ({{ file.name unix1 }}) executable, which was subsequently executed with arguments targeting the user's keychain database ({{ process.command_line /Users/james/unix1 /Users/james/library/Keychains/login.keychain-db ... }}), indicating credential theft.\n- The attack chain shows initial access via a trojanized app, credential phishing, privilege escalation, and credential exfiltration, all on {{ host.name c07f52c5-19b2-4eec-99ca-8f802acf97e4 }} by {{ user.name 19931f1b-b438-41e4-b423-8c3030e81516 }}.",
      entity_summary_markdown:
        'macOS credential theft on {{ host.name c07f52c5-19b2-4eec-99ca-8f802acf97e4 }} by {{ user.name 19931f1b-b438-41e4-b423-8c3030e81516 }}.',
      generation_uuid: 'bb09576f-60fb-4f05-8219-f1c796585021',
      id: '457623feab9f1023520e7660a747fbdad98087e2074de9464ba8cf6ed72017a6',
      mitre_attack_tactics: [
        'Initial Access',
        'Execution',
        'Credential Access',
        'Persistence',
        'Defense Evasion',
      ],
      replacements: {
        '639ad56e-d94f-44de-b92b-14ab77d8c65f': 'root',
        'c07f52c5-19b2-4eec-99ca-8f802acf97e4': 'SRVMAC08',
        '19931f1b-b438-41e4-b423-8c3030e81516': 'james',
        '8f66d5b8-595e-4189-bfce-6541f81f4477': 'SRVWIN07',
        'fb5924ec-2cfb-406d-a96d-4c2ea85fba36': 'Administrator',
        '2d3e3831-a0bc-445b-a926-effd9db5b364': 'SRVWIN06',
        '2270fcd6-8451-4c78-aaa2-8f9f229b2bce': 'SRVNIX05',
        '5e5442b3-fe79-4625-bfe0-9a53641a707f': 'SRVWIN04',
        '10d4f764-55f4-4d30-b024-2b725285f03e': 'SRVWIN03',
        '6ff109ee-17f0-48df-b799-3847bf426dca': 'SRVWIN02',
        'ec003e6b-7dd1-4905-8523-ce42525381da': 'SRVWIN01',
      },
      risk_score: 792,
      summary_markdown:
        'macOS phishing app led to credential theft on {{ host.name c07f52c5-19b2-4eec-99ca-8f802acf97e4 }} by {{ user.name 19931f1b-b438-41e4-b423-8c3030e81516 }}.',
      timestamp: '2025-06-27T17:06:07.163Z',
      title: 'macOS phishing to credential theft',
      user_id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      user_name: 'elastic',
      users: [
        {
          id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          name: 'elastic',
        },
      ],
    },
  ],
  page: 1,
  per_page: 10,
  total: 2,
  unique_alert_ids_count: 13,
});
