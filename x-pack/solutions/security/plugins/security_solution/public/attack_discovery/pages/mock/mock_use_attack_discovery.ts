/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseAttackDiscovery } from '../use_attack_discovery';

export const getMockUseAttackDiscoveriesWithCachedAttackDiscoveries = (
  fetchAttackDiscoveries: () => Promise<void>
): UseAttackDiscovery => ({
  alertsContextCount: 20,
  approximateFutureTime: null,
  isLoadingPost: false,
  stats: null,
  didInitialFetch: true,
  failureReason: null,
  generationIntervals: [
    {
      date: new Date('2024-04-15T13:48:44.397Z').toISOString(),
      durationMs: 85807,
    },
    {
      date: new Date('2024-04-15T12:41:15.255Z').toISOString(),
      durationMs: 12751,
    },
    {
      date: new Date('2024-04-12T20:59:13.238Z').toISOString(),
      durationMs: 46169,
    },
    {
      date: new Date('2024-04-12T19:34:56.701Z').toISOString(),
      durationMs: 86674,
    },
    {
      date: new Date('2024-04-12T19:17:21.697Z').toISOString(),
      durationMs: 78486,
    },
  ],
  fetchAttackDiscoveries,
  onCancel: jest.fn(),
  attackDiscoveries: [
    {
      timestamp: new Date('2024-04-15T15:11:24.906Z').toISOString(),
      alertIds: [
        'e770a817-0e87-4e4b-8e26-1bf504a209d2',
        'f0ab5b5d-55c5-4d05-8f4f-12f0e62ecd96',
        '8cfde870-cd3b-40b8-9999-901c0b97fb5a',
        'da8fa0b1-1f51-4c63-b5d0-2e35c9fa3b84',
        '597fd583-4036-4631-a71a-7a8a7dd17848',
        '550691a2-edac-4cc5-a453-6a36d5351c76',
        'df97c2d9-9e28-43e0-a461-3bacf91a262f',
        'f6558144-630c-49ec-8aa2-fe96364883c7',
        '113819ec-cfd0-4867-bfbd-cb9ca8e1e69f',
        'c6cbd80f-9602-4748-b951-56c0745f3e1f',
      ],
      detailsMarkdown:
        '- {{ host.name 001cc415-42ad-4b21-a92c-e4193b283b78 }} and {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }} were involved in a potential ransomware attack progression:\n\n  - A suspicious executable {{ file.name d55f983c994caa160ec63a59f6b4250fe67fb3e8c43a388aec60a4a6978e9f1e.exe }} was created and executed from {{ file.path 4053a825-9628-470a-8c83-c733e941bece }} by the parent process {{ process.parent.executable C:\\Windows\\Explorer.EXE }}.\n  - The suspicious executable then created another file {{ file.name 604300eb-3711-4e38-8500-0a395d3cc1e5 }} at {{ file.path 8e2853aa-f0b9-4c95-9895-d71a7aa8b4a4 }} and loaded it.\n  - Multiple shellcode injection alerts were triggered by the loaded file, indicating potential malicious activity.\n  - A ransomware detection alert was also triggered, suggesting the presence of ransomware behavior.\n\n- The suspicious executable {{ file.name d55f983c994caa160ec63a59f6b4250fe67fb3e8c43a388aec60a4a6978e9f1e.exe }} had an expired code signature from "TRANSPORT", which is not a trusted source.\n- The loaded file {{ file.name 604300eb-3711-4e38-8500-0a395d3cc1e5 }} was identified as potentially malicious by Elastic Endpoint Security.',
      entitySummaryMarkdown:
        'Potential ransomware attack involving {{ host.name 001cc415-42ad-4b21-a92c-e4193b283b78 }} and {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }}.',
      id: '9f6d4a18-7483-4103-92e7-24e2ebab77bb',
      mitreAttackTactics: ['Execution', 'Persistence', 'Privilege Escalation', 'Defense Evasion'],
      summaryMarkdown:
        'A potential ransomware attack progression was detected on {{ host.name 001cc415-42ad-4b21-a92c-e4193b283b78 }} involving {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }}. A suspicious executable with an untrusted code signature was executed, leading to the creation and loading of a malicious file that triggered shellcode injection and ransomware detection alerts.',
      title: 'Potential Ransomware Attack Progression Detected',
    },
    {
      timestamp: new Date('2024-04-15T15:11:24.906Z').toISOString(),
      alertIds: [
        '4691c8da-ccba-40f2-b540-0ec5656ad8ef',
        '53b3ee1a-1594-447d-94a0-338af2a22844',
        '2e744d88-3040-4ab8-90a3-1d5011ab1a6b',
        '452ed87e-2e64-486b-ad6a-b368010f570a',
        'd2ce2be7-1d86-4fbe-851a-05883e575a0b',
        '7d0ae0fc-7c24-4760-8543-dc4d44f17126',
      ],
      detailsMarkdown:
        '- {{ host.name 4d31c85a-f08b-4461-a67e-ca1991427e6d }} and {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }} were involved in a potential malware attack progression:\n\n  - A Microsoft Office process ({{ process.parent.executable C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE }}) launched a suspicious child process ({{ process.name certutil.exe }}) with unusual arguments to decode a file ({{ file.name B1Z8U2N9.txt }}) into another executable ({{ file.name Q3C7N1V8.exe }}).\n  - The decoded executable {{ file.name Q3C7N1V8.exe }} was then executed and created another file {{ file.name 2ddee627-fbe2-45a8-8b2b-eba7542b4e3d }} at {{ file.path ae8aacc8-bfe3-4735-8075-a135fcf60722 }}, which was loaded.\n  - Multiple alerts were triggered, including malware detection, suspicious Microsoft Office child process, uncommon persistence via registry modification, and rundll32 with unusual arguments.\n\n- The decoded executable {{ file.name Q3C7N1V8.exe }} exhibited persistence behavior by modifying the registry.\n- The rundll32.exe process was launched with unusual arguments to load the decoded file, which is a common malware technique.',
      entitySummaryMarkdown:
        'Potential malware attack involving {{ host.name 4d31c85a-f08b-4461-a67e-ca1991427e6d }} and {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }}.',
      id: 'fd82a3bf-45e4-43ba-bb8f-795584923474',
      mitreAttackTactics: ['Execution', 'Persistence', 'Defense Evasion'],
      summaryMarkdown:
        'A potential malware attack progression was detected on {{ host.name 4d31c85a-f08b-4461-a67e-ca1991427e6d }} involving {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }}. A Microsoft Office process launched a suspicious child process that decoded and executed a malicious executable, which exhibited persistence behavior and triggered multiple security alerts.',
      title: 'Potential Malware Attack Progression Detected',
    },
    {
      timestamp: new Date('2024-04-15T15:11:24.906Z').toISOString(),
      alertIds: ['9896f807-4e57-4da8-b1ea-d62645045428'],
      detailsMarkdown:
        '- {{ host.name c7697774-7350-4153-9061-64a484500241 }} and {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }} were involved in a potential malware attack:\n\n  - A Microsoft Office process ({{ process.parent.executable C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE }}) launched a suspicious child process ({{ process.name certutil.exe }}) with unusual arguments to decode a file ({{ file.name K2G8Q8Z9.txt }}) into another executable ({{ file.name Z5K7J6H8.exe }}).\n  - This behavior triggered a "Malicious Behavior Prevention Alert: Suspicious Microsoft Office Child Process" alert.\n\n- The certutil.exe process is commonly abused by malware to decode and execute malicious payloads.',
      entitySummaryMarkdown:
        'Potential malware attack involving {{ host.name c7697774-7350-4153-9061-64a484500241 }} and {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }}.',
      id: '79a97cec-4126-479a-8fa1-706aec736bc5',
      mitreAttackTactics: ['Execution', 'Defense Evasion'],
      summaryMarkdown:
        'A potential malware attack was detected on {{ host.name c7697774-7350-4153-9061-64a484500241 }} involving {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }}. A Microsoft Office process launched a suspicious child process that attempted to decode and execute a malicious payload, triggering a security alert.',
      title: 'Potential Malware Attack Detected',
    },
    {
      timestamp: new Date('2024-04-15T15:11:24.906Z').toISOString(),
      alertIds: ['53157916-4437-4a92-a7fd-f792c4aa1aae'],
      detailsMarkdown:
        '- {{ host.name 6d4355b3-3d1a-4673-b0c7-51c1c698bcc5 }} and {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }} were involved in a potential malware incident:\n\n  - The explorer.exe process ({{ process.executable C:\\Windows\\explorer.exe }}) attempted to create a file ({{ file.name 25a994dc-c605-425c-b139-c273001dc816 }}) at {{ file.path 9693f967-2b96-4281-893e-79adbdcf1066 }}.\n  - This file creation attempt was blocked, and a "Malware Prevention Alert" was triggered.\n\n- The file {{ file.name 25a994dc-c605-425c-b139-c273001dc816 }} was likely identified as malicious by Elastic Endpoint Security, leading to the prevention of its creation.',
      entitySummaryMarkdown:
        'Potential malware incident involving {{ host.name 6d4355b3-3d1a-4673-b0c7-51c1c698bcc5 }} and {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }}.',
      id: '13c4a00d-88a8-408c-9ed5-b2518df0eae3',
      mitreAttackTactics: ['Defense Evasion'],
      summaryMarkdown:
        'A potential malware incident was detected on {{ host.name 6d4355b3-3d1a-4673-b0c7-51c1c698bcc5 }} involving {{ user.name 73f9a91c-3268-4229-8bb9-7c1fe2f667bc }}. The explorer.exe process attempted to create a file that was identified as malicious by Elastic Endpoint Security, triggering a malware prevention alert and blocking the file creation.',
      title: 'Potential Malware Incident Detected',
    },
  ],
  lastUpdated: new Date('2024-04-15T13:48:44.393Z'),
  replacements: {
    '8e2853aa-f0b9-4c95-9895-d71a7aa8b4a4': 'C:\\Windows\\mpsvc.dll',
    '73f9a91c-3268-4229-8bb9-7c1fe2f667bc': 'Administrator',
    '001cc415-42ad-4b21-a92c-e4193b283b78': 'SRVWIN02',
    'b0fd402c-9752-4d43-b0f7-9750cce247e7': 'OMM-WIN-DETECT',
    '604300eb-3711-4e38-8500-0a395d3cc1e5': 'mpsvc.dll',
    'e770a817-0e87-4e4b-8e26-1bf504a209d2':
      '13c8569b2bfd65ecfa75b264b6d7f31a1b50c530101bcaeb8569b3a0190e93b4',
    'f0ab5b5d-55c5-4d05-8f4f-12f0e62ecd96':
      '250d812f9623d0916bba521d4221757163f199d64ffab92f888581a00ca499be',
    '4053a825-9628-470a-8c83-c733e941bece':
      'C:\\Users\\Administrator\\Desktop\\8813719803\\d55f983c994caa160ec63a59f6b4250fe67fb3e8c43a388aec60a4a6978e9f1e.exe',
    '2acbc31d-a0ec-4f99-a544-b23fcdd37b70':
      'd55f983c994caa160ec63a59f6b4250fe67fb3e8c43a388aec60a4a6978e9f1e.exe',
    '8cfde870-cd3b-40b8-9999-901c0b97fb5a':
      '138876c616a2f403aadb6a1c3da316d97f15669fc90187a27d7f94a55674d19a',
    'da8fa0b1-1f51-4c63-b5d0-2e35c9fa3b84':
      '2bc20691da4ec37cc1f967d6f5b79e95c7f07f6e473724479dcf4402a192969c',
    '9693f967-2b96-4281-893e-79adbdcf1066':
      'C:\\Users\\Administrator\\Desktop\\8813719803\\d55f983c994caa160ec63a59f6b4250fe67fb3e8c43a388aec60a4a6978e9f1e',
    '25a994dc-c605-425c-b139-c273001dc816':
      'd55f983c994caa160ec63a59f6b4250fe67fb3e8c43a388aec60a4a6978e9f1e',
    '597fd583-4036-4631-a71a-7a8a7dd17848':
      '6cea6124aa27adf2f782db267c5173742b675331107cdb7372a46ae469366210',
    '550691a2-edac-4cc5-a453-6a36d5351c76':
      '26a9788ca7189baa31dcbb509779c1ac5d2e72297cb02e4b4ee8c1f9e371666f',
    'df97c2d9-9e28-43e0-a461-3bacf91a262f':
      'c107e4e903724f2a1e0ea8e0135032d1d75624bf7de8b99c17ba9a9f178c2d6a',
    'f6558144-630c-49ec-8aa2-fe96364883c7':
      'afb8ed160ae9f78990980d92fb3213ffff74a12ec75034384b4f53a3edf74400',
    'c6cbd80f-9602-4748-b951-56c0745f3e1f':
      '137aa729928d2a0df1d5e35f47f0ad2bd525012409a889358476dca8e06ba804',
    '113819ec-cfd0-4867-bfbd-cb9ca8e1e69f':
      '5bec676e7faa4b6329027c9798e70e6d5e7a4d6d08696597dc8a3b31490bdfe5',
    'ae8aacc8-bfe3-4735-8075-a135fcf60722': 'C:\\Users\\Administrator\\AppData\\Local\\cdnver.dll',
    '4d31c85a-f08b-4461-a67e-ca1991427e6d': 'SRVWIN01',
    '2ddee627-fbe2-45a8-8b2b-eba7542b4e3d': 'cdnver.dll',
    '8e8e2e05-521d-4988-b7ce-4763fea1faf0':
      'f5d9e2d82dad1ff40161b92c097340ee07ae43715f6c9270705fb0db7a9eeca4',
    '4691c8da-ccba-40f2-b540-0ec5656ad8ef':
      'b4bf1d7b993141f813008dccab0182af3c810de0c10e43a92ac0d9d5f1dbf42e',
    '53b3ee1a-1594-447d-94a0-338af2a22844':
      '4ab871ec3d41d3271c2a1fc3861fabcbc06f7f4534a1b6f741816417bc73927c',
    '2e744d88-3040-4ab8-90a3-1d5011ab1a6b':
      '1f492a1b66f6c633a81a4c6318345b07f6d05624714da0b0cb7dd6d8e374e249',
    '9e44ac92-1d88-4cfc-9f38-781c3457b395':
      'e6fba60799acc5bf85ca34ec634482b95ac941c71e9822dfa34d9d774dd1e2bd',
    '5164c2f3-9f96-4867-a263-cc7041b06ece': 'C:\\ProgramData\\Q3C7N1V8.exe',
    '0aaff15a-a311-46b8-b20b-0db550e5005e': 'Q3C7N1V8.exe',
    '452ed87e-2e64-486b-ad6a-b368010f570a':
      '4be1be7b4351f2e94fa706ea1ab7f9dd7c3267a77832e94794ebb2b0a6d8493a',
    '84e2000b-3c0a-4775-9903-89ebe953f247': 'C:\\Programdata\\Q3C7N1V8.exe',
    'd2ce2be7-1d86-4fbe-851a-05883e575a0b':
      '5ed1aa94157bd6b949bf1527320caf0e6f5f61d86518e5f13912314d0f024e88',
    '7d0ae0fc-7c24-4760-8543-dc4d44f17126':
      'a786f965902ed5490656f48adc79b46676dc2518a052759625f6108bbe2d864d',
    'c7697774-7350-4153-9061-64a484500241': 'SRVWIN01-PRIV',
    'b26da819-a141-4efd-84b0-6d2876f8800d': 'OMM-WIN-PREVENT',
    '9896f807-4e57-4da8-b1ea-d62645045428':
      '2a33e2c6150dfc6f0d49022fc0b5aefc90db76b6e237371992ebdee909d3c194',
    '6d4355b3-3d1a-4673-b0c7-51c1c698bcc5': 'SRVWIN02-PRIV',
    '53157916-4437-4a92-a7fd-f792c4aa1aae':
      '605ebf550ae0ffc4aec2088b97cbf99853113b0db81879500547c4277ca1981a',
  },
  isLoading: false,
});

export const getMockUseAttackDiscoveriesWithNoAttackDiscoveriesLoading = (
  fetchAttackDiscoveries: () => Promise<void>
): UseAttackDiscovery => ({
  alertsContextCount: null,
  approximateFutureTime: new Date('2024-04-15T17:13:29.470Z'), // <-- estimated generation completion time
  fetchAttackDiscoveries,
  onCancel: jest.fn(),
  generationIntervals: undefined,
  attackDiscoveries: [],
  isLoadingPost: false,
  stats: null,
  didInitialFetch: true,
  failureReason: null,
  lastUpdated: null,
  replacements: {},
  isLoading: true, // <-- attack discoveries are being generated
});
