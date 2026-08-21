/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Comprehensive demo seed data for Dark Watch + Deep Watch + Response Actions
 * three-Watch end-to-end demonstration.
 *
 * Scenarios:
 *   1. Chrysalis backdoor on srv-win-defend-01 (real attack, full telemetry)
 *   2. APT29 tool drop on srv-win-defend-02 (real attack, partial telemetry)
 *   3. Noisy EDR maintenance on srv-win-defend-03 (false positive, abundant telemetry)
 *   4. Lateral movement srv-win-defend-01 → srv-win-defend-04 (multi-host chain)
 *
 * Indices populated:
 *   - .kibana-threat-reports        (enriched threat intel)
 *   - .kibana-threat-intel-sources   (feed catalog)
 *   - .kibana-threat-intel-subscriptions (user subscriptions)
 *   - .kibana-threat-intel-indicators    (flattened IoCs)
 *   - .kibana-threat-intel-hunt-findings (continuous hunt results)
 *   - .kibana-threat-intel-advisories    (promoted findings)
 *   - .kibana-threat-intel-digests       (digest history)
 *   - metrics-endpoint.events.process-*  (EDR process telemetry)
 *   - metrics-endpoint.events.network-*  (EDR network telemetry)
 *   - metrics-endpoint.events.file-*     (EDR file telemetry)
 *   - .alerts-security.alerts-default    (Detection Engine alerts)
 */

const { Client } = require('@elastic/elasticsearch');

const ES_HOST = process.env.ES_HOST || 'http://localhost:9200';
const AUTH = process.env.ES_AUTH;

const client = new Client({
  node: ES_HOST,
  auth: AUTH ? { apiKey: AUTH } : undefined,
  tls: { rejectUnauthorized: false },
});

/* ════════════════════════════════════════════════════════════════════
   Shared constants — keep consistency across all indices
   ════════════════════════════════════════════════════════════════════ */

const NOW = new Date('2026-07-21T14:00:00.000Z');
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

function destructureDoc(doc) {
  const { _id, _index, ...rest } = doc;
  if (!rest['@timestamp']) {
    rest['@timestamp'] = rest.published_at || rest.ingestion_timestamp || new Date().toISOString();
  }
  return rest;
}

const CHRYSALIS_HASH_SHA256 = '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f';
const CHRYSALIS_HASH_MD5 = '5fd0c0c013c1f6441f512a678ece59e1';
const CHRYSALIS_C2_IP = '185.220.101.47';
const CHRYSALIS_C2_DOMAIN = 'updateservice[.]azureedge[.]net';
const CHRYSALIS_LOADER_PATH = 'C:\\Windows\\Temp\\BluetoothService.exe';

const APT29_HASH_SHA256 = 'b8c3c2c8a42b9c6c5a2e1f4d3b8a6c7e9f2d4b5a6c8e1f3d5b7a9c1e3f5d7b9a';
const APT29_C2_IP = '192.168.178.91';
const APT29_C2_DOMAIN = 'office365-update[.]com';

const NOISY_IP = '10.0.1.50'; // internal maintenance host

const HOSTS = [
  { id: 'srv-win-defend-01', os: 'Windows 11 23H2', role: 'Domain Controller', user: 'SYSTEM' },
  { id: 'srv-win-defend-02', os: 'Windows Server 2022', role: 'File Server', user: 'svc_backup' },
  { id: 'srv-win-defend-03', os: 'Windows 10 22H2', role: 'Workstation', user: 'jdoe' },
  { id: 'srv-win-defend-04', os: 'Windows 11 23H2', role: 'HR Workstation', user: 'asmith' },
];

/* ════════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════════ */

function ts(hoursAgo) {
  return new Date(NOW.getTime() - hoursAgo * ONE_HOUR).toISOString();
}

function randomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/* ════════════════════════════════════════════════════════════════════
   1. Threat Reports (.kibana-threat-reports)
   ════════════════════════════════════════════════════════════════════ */

async function seedThreatReports() {
  const reports = [
    {
      _id: 'report-chrysalis-001',
      content_fingerprint: 'chrysalis-backdoor-jun-2026-v1',
      title: 'Chrysalis Backdoor: BluetoothService Loader Targeting Windows Environments',
      source: {
        name: 'Elastic Security Labs',
        type: 'RSS',
        url: 'https://elastic.co/security-labs/chrysalis-backdoor',
      },
      published_at: ts(48),
      ingestion_timestamp: ts(47.5),
      severity: 'critical',
      tags: ['apt', 'backdoor', 'windows', 'bluetooth', 'persistence'],
      diamond: {
        adversary: {
          name: 'Unknown — likely APT29 affiliate',
          description: 'TTP overlap with APT29 but distinct infrastructure',
        },
        capability: {
          name: 'Chrysalis backdoor loader',
          description: 'Bluetooth-themed loader, DLL sideloading, registry persistence',
        },
        infrastructure: [
          { type: 'domain', value: CHRYSALIS_C2_DOMAIN, role: 'C2' },
          { type: 'ip', value: CHRYSALIS_C2_IP, role: 'C2' },
        ],
        victim: { sector: 'Technology', geographic_region: 'North America' },
      },
      iocs_extracted: [
        {
          type: 'file_hash',
          value: CHRYSALIS_HASH_SHA256,
          confidence: 0.95,
          context: 'Loader binary',
        },
        { type: 'ip_address', value: CHRYSALIS_C2_IP, confidence: 0.92, context: 'C2 endpoint' },
        {
          type: 'domain',
          value: CHRYSALIS_C2_DOMAIN,
          confidence: 0.88,
          context: 'Domain fronting',
        },
        {
          type: 'file_path',
          value: CHRYSALIS_LOADER_PATH,
          confidence: 0.85,
          context: 'Drop location',
        },
      ],
      taxonomy: {
        threat_category: 'Backdoor',
        geographic_region: 'North America',
        actor_motivation: 'Espionage',
      },
      enrichment_status: 'complete',
      extraction_method: 'diamond_model',
      _index: '.kibana-threat-reports',
    },
    {
      _id: 'report-apt29-001',
      content_fingerprint: 'apt29-tools-may-2026-v1',
      title: 'APT29 Tool Drop: Cobalt Strike Beacon Variant Observed in Enterprise Environments',
      source: {
        name: 'Mandiant Threat Intel',
        type: 'STIX',
        url: 'https://mandiant.com/reports/apt29-tools-2026',
      },
      published_at: ts(72),
      ingestion_timestamp: ts(71.5),
      severity: 'high',
      tags: ['apt29', 'cobalt-strike', 'beacon', 'lateral-movement', 'russia'],
      diamond: {
        adversary: { name: 'APT29 (Cozy Bear)', description: 'Russian SVR-affiliated APT' },
        capability: {
          name: 'Cobalt Strike Beacon variant',
          description: 'Modified beacon with custom Malleable C2 profile',
        },
        infrastructure: [
          { type: 'domain', value: APT29_C2_DOMAIN, role: 'C2' },
          { type: 'ip', value: APT29_C2_IP, role: 'Redirector' },
        ],
        victim: { sector: 'Government', geographic_region: 'Europe' },
      },
      iocs_extracted: [
        {
          type: 'file_hash',
          value: APT29_HASH_SHA256,
          confidence: 0.91,
          context: 'Modified beacon',
        },
        { type: 'ip_address', value: APT29_C2_IP, confidence: 0.89, context: 'Redirector' },
        { type: 'domain', value: APT29_C2_DOMAIN, confidence: 0.87, context: 'C2 domain' },
      ],
      taxonomy: {
        threat_category: 'Espionage',
        geographic_region: 'Europe',
        actor_motivation: 'Intelligence Collection',
      },
      enrichment_status: 'complete',
      extraction_method: 'diamond_model',
      _index: '.kibana-threat-reports',
    },
    {
      _id: 'report-generic-001',
      content_fingerprint: 'edr-maintenance-noise-jul-2026-v1',
      title: 'Routine EDR Agent Maintenance Generates Noise in Process Creation Logs',
      source: { name: 'Internal Security Team', type: 'analyst_paste', url: null },
      published_at: ts(12),
      ingestion_timestamp: ts(11.5),
      severity: 'low',
      tags: ['noise', 'edr', 'maintenance', 'false-positive'],
      diamond: null,
      iocs_extracted: [],
      taxonomy: { threat_category: 'Noise', geographic_region: 'Global', actor_motivation: 'N/A' },
      enrichment_status: 'complete',
      extraction_method: 'manual',
      _index: '.kibana-threat-reports',
    },
  ];

  for (const report of reports) {
    await client.index({
      index: report._index,
      document: destructureDoc(report),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${reports.length} threat reports`);
}

/* ════════════════════════════════════════════════════════════════════
   2. Threat Intel Sources (.kibana-threat-intel-sources)
   ════════════════════════════════════════════════════════════════════ */

async function seedSources() {
  const sources = [
    {
      _id: 'source-elastic-labs',
      name: 'Elastic Security Labs',
      type: 'RSS',
      url: 'https://elastic.co/security-labs/feed.xml',
      poll_interval_minutes: 60,
      enabled: true,
      last_poll_timestamp: ts(1),
      dedup_config: { field: 'content_fingerprint', ttl_hours: 168 },
      _index: '.kibana-threat-intel-sources',
    },
    {
      _id: 'source-mandiant',
      name: 'Mandiant Threat Intel',
      type: 'STIX',
      url: 'https://mandiant.com/api/v1/stix',
      poll_interval_minutes: 120,
      enabled: true,
      last_poll_timestamp: ts(2),
      dedup_config: { field: 'content_fingerprint', ttl_hours: 336 },
      _index: '.kibana-threat-intel-sources',
    },
  ];

  for (const source of sources) {
    await client.index({
      index: source._index,
      document: destructureDoc(source),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${sources.length} sources`);
}

/* ════════════════════════════════════════════════════════════════════
   3. Subscriptions (.kibana-threat-intel-subscriptions)
   ════════════════════════════════════════════════════════════════════ */

async function seedSubscriptions() {
  const subs = [
    {
      _id: 'sub-admin-001',
      user_id: 'admin@elastic.co',
      name: 'Critical APT Alerts',
      filter: { severity: ['critical', 'high'], tags: ['apt', 'apt29', 'backdoor'] },
      delivery: { channel: 'slack', connector_id: 'slack-security-alerts' },
      enabled: true,
      _index: '.kibana-threat-intel-subscriptions',
    },
    {
      _id: 'sub-soc-001',
      user_id: 'soc@elastic.co',
      name: ' SOC Digest',
      filter: { severity: ['critical', 'high', 'medium'] },
      delivery: { channel: 'email', connector_id: 'email-soc-digest' },
      enabled: true,
      _index: '.kibana-threat-intel-subscriptions',
    },
  ];

  for (const sub of subs) {
    await client.index({
      index: sub._index,
      document: destructureDoc(sub),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${subs.length} subscriptions`);
}

/* ════════════════════════════════════════════════════════════════════
   4. Indicators (.kibana-threat-intel-indicators)
   ════════════════════════════════════════════════════════════════════ */

async function seedIndicators() {
  const indicators = [
    {
      _id: `ioc-sha256-${CHRYSALIS_HASH_SHA256}`,
      type: 'file_hash',
      value: CHRYSALIS_HASH_SHA256,
      report_ids: ['report-chrysalis-001'],
      first_seen: ts(48),
      last_seen: ts(24),
      confidence: 0.95,
      _index: '.kibana-threat-intel-indicators',
    },
    {
      _id: `ioc-md5-${CHRYSALIS_HASH_MD5}`,
      type: 'file_hash',
      value: CHRYSALIS_HASH_MD5,
      report_ids: ['report-chrysalis-001'],
      first_seen: ts(48),
      last_seen: ts(24),
      confidence: 0.9,
      _index: '.kibana-threat-intel-indicators',
    },
    {
      _id: `ioc-ip-${CHRYSALIS_C2_IP}`,
      type: 'ip_address',
      value: CHRYSALIS_C2_IP,
      report_ids: ['report-chrysalis-001'],
      first_seen: ts(48),
      last_seen: ts(6),
      confidence: 0.92,
      _index: '.kibana-threat-intel-indicators',
    },
    {
      _id: `ioc-domain-${CHRYSALIS_C2_DOMAIN}`,
      type: 'domain',
      value: CHRYSALIS_C2_DOMAIN,
      report_ids: ['report-chrysalis-001'],
      first_seen: ts(48),
      last_seen: ts(6),
      confidence: 0.88,
      _index: '.kibana-threat-intel-indicators',
    },
    {
      _id: `ioc-sha256-${APT29_HASH_SHA256}`,
      type: 'file_hash',
      value: APT29_HASH_SHA256,
      report_ids: ['report-apt29-001'],
      first_seen: ts(72),
      last_seen: ts(48),
      confidence: 0.91,
      _index: '.kibana-threat-intel-indicators',
    },
  ];

  for (const ioc of indicators) {
    await client.index({
      index: ioc._index,
      document: destructureDoc(ioc),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${indicators.length} indicators`);
}

/* ════════════════════════════════════════════════════════════════════
   5. Hunt Findings (.kibana-threat-intel-hunt-findings)
   ════════════════════════════════════════════════════════════════════ */

async function seedHuntFindings() {
  const findings = [
    {
      _id: 'finding-chrysalis-01',
      hunt_id: 'hunt-continuous-2026-07-21-1400',
      report_id: 'report-chrysalis-001',
      tier: 1,
      status: 'confirmed_hit',
      environment_hits: [
        {
          host: HOSTS[0].id,
          hit_type: 'process_creation',
          evidence: {
            process_name: 'BluetoothService.exe',
            hash_sha256: CHRYSALIS_HASH_SHA256,
            path: CHRYSALIS_LOADER_PATH,
          },
          timestamp: ts(24),
          confidence: 'high',
        },
        {
          host: HOSTS[0].id,
          hit_type: 'network_connection',
          evidence: { destination_ip: CHRYSALIS_C2_IP, destination_port: 443, protocol: 'tls' },
          timestamp: ts(23),
          confidence: 'high',
        },
      ],
      behavioral_gaps: [
        {
          technique: 'T1055',
          description:
            'Process Injection — no detection rule for dllhost.exe injection by BluetoothService.exe',
          coverage: 'gap',
        },
        {
          technique: 'T1547.001',
          description: 'Registry Run Keys — detection exists but disabled on srv-win-defend-01',
          coverage: 'partial',
        },
      ],
      created_at: ts(23),
      _index: '.kibana-threat-intel-hunt-findings',
    },
    {
      _id: 'finding-apt29-01',
      hunt_id: 'hunt-continuous-2026-07-21-1400',
      report_id: 'report-apt29-001',
      tier: 2,
      status: 'proposed_hunt',
      environment_hits: [
        {
          host: HOSTS[1].id,
          hit_type: 'process_creation',
          evidence: {
            process_name: 'rundll32.exe',
            command_line: 'rundll32.exe C:\\Users\\svc_backup\\AppData\\Local\\Temp\\update.dll',
            hash_sha256: APT29_HASH_SHA256,
          },
          timestamp: ts(36),
          confidence: 'medium',
        },
      ],
      behavioral_gaps: [
        {
          technique: 'T1059.003',
          description: 'Windows Command Shell — living-off-the-land binary abuse',
          coverage: 'partial',
        },
      ],
      created_at: ts(36),
      _index: '.kibana-threat-intel-hunt-findings',
    },
  ];

  for (const finding of findings) {
    await client.index({
      index: finding._index,
      document: destructureDoc(finding),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${findings.length} hunt findings`);
}

/* ════════════════════════════════════════════════════════════════════
   6. Advisories (.kibana-threat-intel-advisories)
   ════════════════════════════════════════════════════════════════════ */

async function seedAdvisories() {
  const advisories = [
    {
      _id: 'advisory-chrysalis-001',
      title: 'Chrysalis Backdoor Confirmed in Environment',
      severity: 'critical',
      finding_id: 'finding-chrysalis-01',
      report_id: 'report-chrysalis-001',
      affected_hosts: [HOSTS[0].id],
      recommended_actions: [
        'Isolate srv-win-defend-01 from network',
        'Collect full memory dump before remediation',
        'Review registry persistence entries (Run keys)',
        'Hunt for dllhost.exe injection artifacts',
      ],
      promoted_at: ts(22),
      reviewer: 'SecurityOps',
      _index: '.kibana-threat-intel-advisories',
    },
  ];

  for (const advisory of advisories) {
    await client.index({
      index: advisory._index,
      document: destructureDoc(advisory),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${advisories.length} advisories`);
}

/* ════════════════════════════════════════════════════════════════════
   7. EDR Process Telemetry (metrics-endpoint.events.process-*)
   ════════════════════════════════════════════════════════════════════ */

async function seedProcessEvents() {
  const events = [
    // ── Scenario 1: Chrysalis on srv-win-defend-01 ──
    {
      _id: randomId(),
      '@timestamp': ts(25),
      agent: { id: 'agent-01', type: 'endpoint' },
      host: { name: HOSTS[0].id, os: { name: HOSTS[0].os } },
      user: { name: HOSTS[0].user },
      process: {
        name: 'BluetoothService.exe',
        executable: CHRYSALIS_LOADER_PATH,
        hash: { sha256: CHRYSALIS_HASH_SHA256, md5: CHRYSALIS_HASH_MD5 },
        pid: 4824,
        parent: { name: 'svchost.exe', pid: 892 },
        command_line: 'C:\\Windows\\Temp\\BluetoothService.exe -startup',
      },
      event: { category: 'process', type: 'start', action: 'Process Create', outcome: 'success' },
      _index: 'metrics-endpoint.events.process-default',
    },
    {
      _id: randomId(),
      '@timestamp': ts(24.8),
      agent: { id: 'agent-01', type: 'endpoint' },
      host: { name: HOSTS[0].id },
      user: { name: HOSTS[0].user },
      process: {
        name: 'dllhost.exe',
        executable: 'C:\\Windows\\System32\\dllhost.exe',
        pid: 4826,
        parent: { name: 'BluetoothService.exe', pid: 4824 },
        command_line: 'dllhost.exe /Processid:{12345678-1234-1234-1234-123456789012}',
      },
      event: { category: 'process', type: 'start', action: 'Process Create', outcome: 'success' },
      _index: 'metrics-endpoint.events.process-default',
    },
    {
      _id: randomId(),
      '@timestamp': ts(24.5),
      agent: { id: 'agent-01', type: 'endpoint' },
      host: { name: HOSTS[0].id },
      user: { name: HOSTS[0].user },
      process: {
        name: 'reg.exe',
        executable: 'C:\\Windows\\System32\\reg.exe',
        pid: 4830,
        parent: { name: 'BluetoothService.exe', pid: 4824 },
        command_line:
          'reg.exe add HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run /v BluetoothHelper /t REG_SZ /d "C:\\Windows\\Temp\\BluetoothService.exe" /f',
      },
      event: { category: 'process', type: 'start', action: 'Process Create', outcome: 'success' },
      _index: 'metrics-endpoint.events.process-default',
    },
    // ── Scenario 2: APT29 tool drop on srv-win-defend-02 ──
    {
      _id: randomId(),
      '@timestamp': ts(36),
      agent: { id: 'agent-02', type: 'endpoint' },
      host: { name: HOSTS[1].id, os: { name: HOSTS[1].os } },
      user: { name: HOSTS[1].user },
      process: {
        name: 'rundll32.exe',
        executable: 'C:\\Windows\\System32\\rundll32.exe',
        pid: 2156,
        parent: { name: 'explorer.exe', pid: 1124 },
        command_line:
          'rundll32.exe C:\\Users\\svc_backup\\AppData\\Local\\Temp\\update.dll,EntryPoint',
        hash: { sha256: APT29_HASH_SHA256 },
      },
      event: { category: 'process', type: 'start', action: 'Process Create', outcome: 'success' },
      _index: 'metrics-endpoint.events.process-default',
    },
    // ── Scenario 3: Noisy EDR maintenance on srv-win-defend-03 ──
    {
      _id: randomId(),
      '@timestamp': ts(2),
      agent: { id: 'agent-03', type: 'endpoint' },
      host: { name: HOSTS[2].id, os: { name: HOSTS[2].os } },
      user: { name: HOSTS[2].user },
      process: {
        name: 'ElasticEndpoint.exe',
        executable: 'C:\\Program Files\\Elastic\\Endpoint\\elastic-endpoint.exe',
        pid: 9999,
        parent: { name: 'services.exe', pid: 0 },
        command_line: 'ElasticEndpoint.exe --self-heal --repair-registry',
      },
      event: { category: 'process', type: 'start', action: 'Process Create', outcome: 'success' },
      _index: 'metrics-endpoint.events.process-default',
    },
    // ── Scenario 4: Lateral movement ──
    {
      _id: randomId(),
      '@timestamp': ts(22),
      agent: { id: 'agent-01', type: 'endpoint' },
      host: { name: HOSTS[0].id },
      user: { name: HOSTS[0].user },
      process: {
        name: 'wmic.exe',
        executable: 'C:\\Windows\\System32\\wbem\\WMIC.exe',
        pid: 5100,
        parent: { name: 'cmd.exe', pid: 4900 },
        command_line:
          'wmic /node:srv-win-defend-04 process call create "cmd.exe /c C:\\Windows\\Temp\\update.exe"',
      },
      event: { category: 'process', type: 'start', action: 'Process Create', outcome: 'success' },
      _index: 'metrics-endpoint.events.process-default',
    },
    {
      _id: randomId(),
      '@timestamp': ts(21.5),
      agent: { id: 'agent-04', type: 'endpoint' },
      host: { name: HOSTS[3].id, os: { name: HOSTS[3].os } },
      user: { name: HOSTS[3].user },
      process: {
        name: 'cmd.exe',
        executable: 'C:\\Windows\\System32\\cmd.exe',
        pid: 3100,
        parent: { name: 'WmiPrvSE.exe', pid: 0 },
        command_line: 'cmd.exe /c C:\\Windows\\Temp\\update.exe',
        hash: { sha256: CHRYSALIS_HASH_SHA256 },
      },
      event: { category: 'process', type: 'start', action: 'Process Create', outcome: 'success' },
      _index: 'metrics-endpoint.events.process-default',
    },
  ];

  for (const event of events) {
    await client.index({
      index: event._index,
      document: destructureDoc(event),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${events.length} process events`);
}

/* ════════════════════════════════════════════════════════════════════
   8. EDR Network Telemetry (metrics-endpoint.events.network-*)
   ════════════════════════════════════════════════════════════════════ */

async function seedNetworkEvents() {
  const events = [
    {
      _id: randomId(),
      '@timestamp': ts(23),
      agent: { id: 'agent-01', type: 'endpoint' },
      host: { name: HOSTS[0].id },
      source: { ip: '10.0.0.10', port: 51234 },
      destination: { ip: CHRYSALIS_C2_IP, port: 443 },
      network: { protocol: 'https', transport: 'tcp' },
      event: {
        category: 'network',
        type: 'connection',
        action: 'Network Connection Detected',
        outcome: 'success',
      },
      process: { name: 'BluetoothService.exe', pid: 4824, hash: { sha256: CHRYSALIS_HASH_SHA256 } },
      dns: { question: { name: CHRYSALIS_C2_DOMAIN }, resolved_ip: [CHRYSALIS_C2_IP] },
      _index: 'metrics-endpoint.events.network-default',
    },
    {
      _id: randomId(),
      '@timestamp': ts(35),
      agent: { id: 'agent-02', type: 'endpoint' },
      host: { name: HOSTS[1].id },
      source: { ip: '10.0.0.20', port: 42344 },
      destination: { ip: APT29_C2_IP, port: 443 },
      network: { protocol: 'https', transport: 'tcp' },
      event: {
        category: 'network',
        type: 'connection',
        action: 'Network Connection Detected',
        outcome: 'success',
      },
      process: { name: 'rundll32.exe', pid: 2156, hash: { sha256: APT29_HASH_SHA256 } },
      dns: { question: { name: APT29_C2_DOMAIN }, resolved_ip: [APT29_C2_IP] },
      _index: 'metrics-endpoint.events.network-default',
    },
    {
      _id: randomId(),
      '@timestamp': ts(21),
      agent: { id: 'agent-01', type: 'endpoint' },
      host: { name: HOSTS[0].id },
      source: { ip: '10.0.0.10', port: 49200 },
      destination: { ip: '10.0.0.40', port: 445 },
      network: { protocol: 'smb', transport: 'tcp' },
      event: {
        category: 'network',
        type: 'connection',
        action: 'Network Connection Detected',
        outcome: 'success',
      },
      process: { name: 'wmic.exe', pid: 5100 },
      _index: 'metrics-endpoint.events.network-default',
    },
  ];

  for (const event of events) {
    await client.index({
      index: event._index,
      document: destructureDoc(event),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${events.length} network events`);
}

/* ════════════════════════════════════════════════════════════════════
   9. EDR File Telemetry (metrics-endpoint.events.file-*)
   ════════════════════════════════════════════════════════════════════ */

async function seedFileEvents() {
  const events = [
    {
      _id: randomId(),
      '@timestamp': ts(25.2),
      agent: { id: 'agent-01', type: 'endpoint' },
      host: { name: HOSTS[0].id },
      file: {
        path: CHRYSALIS_LOADER_PATH,
        name: 'BluetoothService.exe',
        hash: { sha256: CHRYSALIS_HASH_SHA256, md5: CHRYSALIS_HASH_MD5 },
        size: 245760,
        extension: 'exe',
      },
      event: { category: 'file', type: 'creation', action: 'File Creation', outcome: 'success' },
      process: { name: 'svchost.exe', pid: 892 },
      _index: 'metrics-endpoint.events.file-default',
    },
    {
      _id: randomId(),
      '@timestamp': ts(21),
      agent: { id: 'agent-04', type: 'endpoint' },
      host: { name: HOSTS[3].id },
      file: {
        path: 'C:\\Windows\\Temp\\update.exe',
        name: 'update.exe',
        hash: { sha256: CHRYSALIS_HASH_SHA256 },
        size: 245760,
        extension: 'exe',
      },
      event: { category: 'file', type: 'creation', action: 'File Creation', outcome: 'success' },
      process: { name: 'WmiPrvSE.exe', pid: 0 },
      _index: 'metrics-endpoint.events.file-default',
    },
  ];

  for (const event of events) {
    await client.index({
      index: event._index,
      document: destructureDoc(event),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${events.length} file events`);
}

/* ════════════════════════════════════════════════════════════════════
   10. Detection Engine Alerts (.alerts-security.alerts-default)
   ════════════════════════════════════════════════════════════════════ */

async function seedAlerts() {
  const alerts = [
    {
      _id: randomId(),
      '@timestamp': ts(24),
      agent: { id: 'agent-01', type: 'endpoint' },
      host: { name: HOSTS[0].id },
      kibana: {
        alert: {
          rule: { name: 'Suspicious Process Creation in Temp Directory', uuid: 'rule-001' },
          reason: 'process created in C:\\Windows\\Temp on srv-win-defend-01',
          severity: 'high',
        },
      },
      event: { category: 'process', type: 'start' },
      process: {
        name: 'BluetoothService.exe',
        pid: 4824,
        hash: { sha256: CHRYSALIS_HASH_SHA256 },
        executable: CHRYSALIS_LOADER_PATH,
      },
      threat: {
        technique: [
          {
            id: 'T1547',
            name: 'Boot or Logon Autostart Execution',
            reference: 'https://attack.mitre.org/techniques/T1547',
          },
        ],
        tactic: [
          {
            id: 'TA0003',
            name: 'Persistence',
            reference: 'https://attack.mitre.org/tactics/TA0003',
          },
        ],
      },

      _index: '.alerts-security.alerts-default',
    },
    {
      _id: randomId(),
      '@timestamp': ts(23.5),
      agent: { id: 'agent-01', type: 'endpoint' },
      host: { name: HOSTS[0].id },
      kibana: {
        alert: {
          rule: { name: 'Known Malicious Hash Detected', uuid: 'rule-002' },
          reason: `SHA256 ${CHRYSALIS_HASH_SHA256} matches threat intel indicator`,
          severity: 'critical',
        },
      },
      event: { category: 'malware', type: 'info' },
      file: { hash: { sha256: CHRYSALIS_HASH_SHA256 }, path: CHRYSALIS_LOADER_PATH },
      threat: {
        technique: [
          {
            id: 'T1204',
            name: 'User Execution',
            reference: 'https://attack.mitre.org/techniques/T1204',
          },
        ],
        tactic: [
          { id: 'TA0002', name: 'Execution', reference: 'https://attack.mitre.org/tactics/TA0002' },
        ],
      },

      _index: '.alerts-security.alerts-default',
    },
    {
      _id: randomId(),
      '@timestamp': ts(35.5),
      agent: { id: 'agent-02', type: 'endpoint' },
      host: { name: HOSTS[1].id },
      kibana: {
        alert: {
          rule: { name: 'Suspicious Rundll32 Execution', uuid: 'rule-003' },
          reason: 'rundll32.exe executed with uncommon DLL path on srv-win-defend-02',
          severity: 'medium',
        },
      },
      event: { category: 'process', type: 'start' },
      process: { name: 'rundll32.exe', executable: 'C:\\Windows\\System32\\rundll32.exe' },
      threat: {
        technique: [
          {
            id: 'T1218',
            name: 'System Binary Proxy Execution',
            reference: 'https://attack.mitre.org/techniques/T1218',
          },
        ],
        tactic: [
          {
            id: 'TA0005',
            name: 'Defense Evasion',
            reference: 'https://attack.mitre.org/tactics/TA0005',
          },
        ],
      },

      _index: '.alerts-security.alerts-default',
    },
    {
      _id: randomId(),
      '@timestamp': ts(2.5),
      agent: { id: 'agent-03', type: 'endpoint' },
      host: { name: HOSTS[2].id },
      kibana: {
        alert: {
          rule: { name: 'Endpoint Agent Self-Heal', uuid: 'rule-004' },
          reason: 'ElasticEndpoint.exe self-heal process launched — benign maintenance',
          severity: 'low',
        },
      },
      event: { category: 'process', type: 'start' },
      process: { name: 'ElasticEndpoint.exe' },
      threat: {},

      _index: '.alerts-security.alerts-default',
    },
  ];

  for (const alert of alerts) {
    await client.index({
      index: alert._index,
      document: destructureDoc(alert),
      op_type: 'create',
      refresh: true,
    });
  }
  console.log(`✅ Seeded ${alerts.length} detection engine alerts`);
}

/* ════════════════════════════════════════════════════════════════════
   Main
   ════════════════════════════════════════════════════════════════════ */

async function main() {
  console.log('🌱 Seeding comprehensive demo data for Dark Watch + Deep Watch demonstration...\n');
  console.log(`Elasticsearch: ${ES_HOST}`);
  console.log(`Base timestamp: ${NOW.toISOString()}\n`);

  try {
    const health = await client.cluster.health({ wait_for_status: 'yellow', timeout: '30s' });
    console.log(`✅ ES cluster health: ${health.status}\n`);

    await seedThreatReports();
    await seedSources();
    await seedSubscriptions();
    await seedIndicators();
    await seedHuntFindings();
    await seedAdvisories();
    await seedProcessEvents();
    await seedNetworkEvents();
    await seedFileEvents();
    await seedAlerts();

    console.log('\n🎉 All demo data seeded successfully!');
    console.log('\nDemo scenarios:');
    console.log('  1. Chrysalis backdoor on srv-win-defend-01 (critical, full chain)');
    console.log('  2. APT29 tool drop on srv-win-defend-02 (high, partial chain)');
    console.log('  3. Noisy EDR maintenance on srv-win-defend-03 (low, false positive)');
    console.log('  4. Lateral movement srv-win-defend-01 → srv-win-defend-04');
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.meta?.body?.error) {
      console.error(JSON.stringify(err.meta.body.error, null, 2));
    }
    process.exit(1);
  }
}

main();
