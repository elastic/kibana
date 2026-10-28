/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Synthetic documents, no real data: hand-written, with only the key fields. `strict` and `wide`
// number the group each alert falls in (null: no key), as an offline reference implementation of
// the keys gave them. Offline tooling generated this file. It is not checked in: it shares code
// with scripts that read real alert dumps (real hostnames, users and command lines), and those
// cannot be checked in. Change these numbers only together with an updated reference.
export const PARITY_ALERTS: Array<{
  id: string;
  doc: Record<string, unknown>;
  strict: number | null;
  wide: number | null;
}> = [
  {
    id: 'win-alice',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Users\\Alice\\AppData\\Tools\\a.exe',
        code_signature: {
          subject_name: 'Acme',
        },
        parent: {
          executable: 'C:\\Windows\\explorer.exe',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 0,
    wide: 0,
  },
  {
    id: 'win-bob-same-pattern',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Users\\Bob\\AppData\\Tools\\a.exe',
        code_signature: {
          subject_name: 'Acme',
        },
        parent: {
          executable: 'C:\\Windows\\explorer.exe',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 0,
    wide: 0,
  },
  {
    id: 'win-other-program-same-folder',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Users\\Alice\\AppData\\Tools\\b.exe',
        code_signature: {
          subject_name: 'Acme',
        },
        parent: {
          executable: 'C:\\Windows\\explorer.exe',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 1,
    wide: 0,
  },
  {
    id: 'win-upper-case',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\USERS\\ALICE\\APPDATA\\TOOLS\\A.EXE',
        code_signature: {
          subject_name: 'Acme',
        },
        parent: {
          executable: 'C:\\Windows\\explorer.exe',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 0,
    wide: 0,
  },
  {
    id: 'win-other-signer',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Users\\Alice\\AppData\\Tools\\a.exe',
        code_signature: {
          subject_name: 'Other',
        },
        parent: {
          executable: 'C:\\Windows\\explorer.exe',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 2,
    wide: 1,
  },
  {
    id: 'win-other-parent',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Users\\Alice\\AppData\\Tools\\a.exe',
        code_signature: {
          subject_name: 'Acme',
        },
        parent: {
          executable: 'C:\\Windows\\cmd.exe',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 3,
    wide: 2,
  },
  {
    id: 'win-unsigned-hash-lower',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Temp\\u.exe',
        hash: {
          sha256: 'abcdef01',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 4,
    wide: 3,
  },
  {
    id: 'win-unsigned-hash-upper',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Temp\\u.exe',
        hash: {
          sha256: 'ABCDEF01',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 4,
    wide: 3,
  },
  {
    id: 'win-unsigned-other-hash',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Temp\\u.exe',
        hash: {
          sha256: 'ffff0001',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 5,
    wide: 4,
  },
  {
    id: 'win-unsigned-no-hash',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Temp\\u.exe',
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 6,
    wide: 5,
  },
  {
    id: 'win-guid-1',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\ProgramData\\{3F2504E0-4F89-11D3-9A0C-0305E82C3301}\\run.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 7,
    wide: 6,
  },
  {
    id: 'win-guid-2',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\ProgramData\\{3F2504E0-4F89-11D3-9A0C-0305E82C9999}\\run.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 7,
    wide: 6,
  },
  {
    id: 'mac-al',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: '/Users/al/Applications/Tool.app/tool',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'macos',
        },
      },
    },
    strict: 8,
    wide: 7,
  },
  {
    id: 'mac-bo-same-pattern',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: '/Users/bo/Applications/Tool.app/tool',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'macos',
        },
      },
    },
    strict: 8,
    wide: 7,
  },
  {
    id: 'mac-system-path',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: '/usr/bin/tool',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'macos',
        },
      },
    },
    strict: 9,
    wide: 8,
  },
  {
    id: 'linux-al',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: '/home/al/bin/tool',
        hash: {
          sha256: 'aa11',
        },
      },
      host: {
        os: {
          type: 'linux',
        },
      },
    },
    strict: 10,
    wide: 9,
  },
  {
    id: 'linux-bo-same-pattern',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: '/home/bo/bin/tool',
        hash: {
          sha256: 'aa11',
        },
      },
      host: {
        os: {
          type: 'linux',
        },
      },
    },
    strict: 10,
    wide: 9,
  },
  {
    id: 'linux-other-folder',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: '/home/bo/sbin/tool',
        hash: {
          sha256: 'aa11',
        },
      },
      host: {
        os: {
          type: 'linux',
        },
      },
    },
    strict: 11,
    wide: 10,
  },
  {
    id: 'no-os-windows-path-stays-exact',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Users\\Alice\\a.exe',
      },
    },
    strict: 12,
    wide: 11,
  },
  {
    id: 'file-1',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['file'],
      },
      file: {
        path: 'C:\\Data\\f1.tmp',
        hash: {
          sha256: 'ee01',
        },
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 13,
    wide: 12,
  },
  {
    id: 'file-2-same-folder',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['file'],
      },
      file: {
        path: 'C:\\Data\\f2.tmp',
        hash: {
          sha256: 'ee01',
        },
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 14,
    wide: 12,
  },
  {
    id: 'file-other-hash',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['file'],
      },
      file: {
        path: 'C:\\Data\\f1.tmp',
        hash: {
          sha256: 'ee02',
        },
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 15,
    wide: 13,
  },
  {
    id: 'library-1',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['library'],
      },
      dll: {
        path: 'C:\\Lib\\x.dll',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 16,
    wide: 14,
  },
  {
    id: 'library-same',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['library'],
      },
      dll: {
        path: 'C:\\Lib\\x.dll',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      process: {
        executable: 'C:\\Other\\z.exe',
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 16,
    wide: 14,
  },
  {
    id: 'library-unsigned',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['library'],
      },
      dll: {
        path: 'C:\\Lib\\x.dll',
        hash: {
          sha256: 'dd01',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 17,
    wide: 15,
  },
  {
    id: 'registry-1',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['registry'],
      },
      registry: {
        path: 'HKLM\\Software\\Vendor\\Key',
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 18,
    wide: 16,
  },
  {
    id: 'registry-same',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['registry'],
      },
      registry: {
        path: 'HKLM\\Software\\Vendor\\Key',
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 18,
    wide: 16,
  },
  {
    id: 'registry-other-program',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['registry'],
      },
      registry: {
        path: 'HKLM\\Software\\Vendor\\Key',
      },
      process: {
        executable: 'C:\\Tools\\v.exe',
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 19,
    wide: 17,
  },
  {
    id: 'category-without-kind-uses-presence',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['malware', 'intrusion_detection'],
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 20,
    wide: 18,
  },
  {
    id: 'file-category-but-only-process-field',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 1,
      event: {
        category: ['file'],
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 20,
    wide: 18,
  },
  {
    id: 'other-rule',
    doc: {
      'kibana.alert.rule.uuid': 'rule-2',
      'kibana.alert.rule.revision': 1,
      process: {
        executable: 'C:\\Users\\Alice\\AppData\\Tools\\a.exe',
        code_signature: {
          subject_name: 'Acme',
        },
        parent: {
          executable: 'C:\\Windows\\explorer.exe',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 21,
    wide: 19,
  },
  {
    id: 'other-revision',
    doc: {
      'kibana.alert.rule.uuid': 'rule-1',
      'kibana.alert.rule.revision': 2,
      process: {
        executable: 'C:\\Users\\Alice\\AppData\\Tools\\a.exe',
        code_signature: {
          subject_name: 'Acme',
        },
        parent: {
          executable: 'C:\\Windows\\explorer.exe',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 22,
    wide: 20,
  },
  {
    id: 'defend-d1',
    doc: {
      'kibana.alert.rule.uuid': 'endpoint',
      'kibana.alert.rule.revision': 1,
      'kibana.alert.rule.rule_name_override': 'message',
      rule: {
        id: 'd1',
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 23,
    wide: 21,
  },
  {
    id: 'defend-d1-again',
    doc: {
      'kibana.alert.rule.uuid': 'endpoint',
      'kibana.alert.rule.revision': 1,
      'kibana.alert.rule.rule_name_override': 'message',
      rule: {
        id: 'd1',
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 23,
    wide: 21,
  },
  {
    id: 'defend-d2',
    doc: {
      'kibana.alert.rule.uuid': 'endpoint',
      'kibana.alert.rule.revision': 1,
      'kibana.alert.rule.rule_name_override': 'message',
      rule: {
        id: 'd2',
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 24,
    wide: 22,
  },
  {
    id: 'defend-event-code-a',
    doc: {
      'kibana.alert.rule.uuid': 'endpoint',
      'kibana.alert.rule.revision': 1,
      'kibana.alert.rule.rule_name_override': 'message',
      event: {
        code: 'shellcode_thread',
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 25,
    wide: 23,
  },
  {
    id: 'defend-event-code-b',
    doc: {
      'kibana.alert.rule.uuid': 'endpoint',
      'kibana.alert.rule.revision': 1,
      'kibana.alert.rule.rule_name_override': 'message',
      event: {
        code: 'malicious_file',
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 26,
    wide: 24,
  },
  {
    id: 'rule-id-ignored-without-override',
    doc: {
      'kibana.alert.rule.uuid': 'endpoint-2',
      'kibana.alert.rule.revision': 1,
      rule: {
        id: 'd1',
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 27,
    wide: 25,
  },
  {
    id: 'no-override-other-rule-id',
    doc: {
      'kibana.alert.rule.uuid': 'endpoint-2',
      'kibana.alert.rule.revision': 1,
      rule: {
        id: 'd2',
      },
      process: {
        executable: 'C:\\Tools\\w.exe',
        code_signature: {
          subject_name: 'Acme',
        },
      },
      host: {
        os: {
          type: 'windows',
        },
      },
    },
    strict: 27,
    wide: 25,
  },
  {
    id: 'cloud-user-a',
    doc: {
      'kibana.alert.rule.uuid': 'cloud-rule',
      'kibana.alert.rule.revision': 1,
      user: {
        name: 'a',
      },
    },
    strict: null,
    wide: 26,
  },
  {
    id: 'cloud-user-b',
    doc: {
      'kibana.alert.rule.uuid': 'cloud-rule',
      'kibana.alert.rule.revision': 1,
      user: {
        name: 'b',
      },
    },
    strict: null,
    wide: 26,
  },
  {
    id: 'cloud-other-rule',
    doc: {
      'kibana.alert.rule.uuid': 'cloud-rule-2',
      'kibana.alert.rule.revision': 1,
      user: {
        name: 'a',
      },
    },
    strict: null,
    wide: 27,
  },
  {
    id: 'cloud-other-revision',
    doc: {
      'kibana.alert.rule.uuid': 'cloud-rule',
      'kibana.alert.rule.revision': 2,
      user: {
        name: 'a',
      },
    },
    strict: null,
    wide: 28,
  },
];
