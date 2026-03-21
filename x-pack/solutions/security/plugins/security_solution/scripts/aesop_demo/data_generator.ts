/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Demo Data Generator
 *
 * Generates synthetic multi-persona security data for AESOP self-exploration demo.
 * Implements data generation from "Beyond Prescribed Intelligence" paper (Ayenson, 2026).
 *
 * Generates:
 * - Security alerts (MITRE ATT&CK aligned)
 * - Persona query behaviors (SOC analyst, SRE, developer)
 * - APM traces (distributed tracing)
 * - Logs (structured + unstructured)
 * - Metrics (infrastructure + application)
 */

import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const ES_URL = process.env.ES_URL || 'http://localhost:9200';
const ES_USERNAME = process.env.ES_USERNAME || 'elastic';
const ES_PASSWORD = process.env.ES_PASSWORD || 'changeme';

// MITRE ATT&CK Tactics (14 tactics from framework)
const MITRE_TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance', techniques: ['T1595', 'T1592', 'T1589'] },
  { id: 'TA0042', name: 'Resource Development', techniques: ['T1583', 'T1586', 'T1587'] },
  { id: 'TA0001', name: 'Initial Access', techniques: ['T1190', 'T1133', 'T1566'] },
  { id: 'TA0002', name: 'Execution', techniques: ['T1059', 'T1203', 'T1106'] },
  { id: 'TA0003', name: 'Persistence', techniques: ['T1053', 'T1547', 'T1136'] },
  { id: 'TA0004', name: 'Privilege Escalation', techniques: ['T1068', 'T1548', 'T1134'] },
  { id: 'TA0005', name: 'Defense Evasion', techniques: ['T1027', 'T1070', 'T1562'] },
  { id: 'TA0006', name: 'Credential Access', techniques: ['T1003', 'T1110', 'T1555'] },
  { id: 'TA0007', name: 'Discovery', techniques: ['T1083', 'T1018', 'T1082'] },
  { id: 'TA0008', name: 'Lateral Movement', techniques: ['T1021', 'T1091', 'T1080'] },
  { id: 'TA0009', name: 'Collection', techniques: ['T1560', 'T1113', 'T1005'] },
  { id: 'TA0011', name: 'Command and Control', techniques: ['T1071', 'T1095', 'T1105'] },
  { id: 'TA0010', name: 'Exfiltration', techniques: ['T1041', 'T1048', 'T1567'] },
  { id: 'TA0040', name: 'Impact', techniques: ['T1485', 'T1486', 'T1490'] },
];

// Persona Definitions
interface Persona {
  id: string;
  name: string;
  role: 'soc_analyst' | 'sre' | 'developer' | 'security_engineer';
  skillLevel: 'junior' | 'mid' | 'senior';
  behaviors: QueryBehavior[];
}

interface QueryBehavior {
  pattern: string;
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly';
  queriesPerDay: number;
}

const PERSONAS: Persona[] = [
  {
    id: 'alice_soc_l3',
    name: 'Alice (SOC L3 Analyst)',
    role: 'soc_analyst',
    skillLevel: 'senior',
    behaviors: [
      { pattern: 'triage_high_severity_alerts', frequency: 'hourly', queriesPerDay: 20 },
      { pattern: 'investigate_suspicious_ips', frequency: 'daily', queriesPerDay: 15 },
      { pattern: 'correlate_related_alerts', frequency: 'daily', queriesPerDay: 10 },
      { pattern: 'enrich_with_threat_intel', frequency: 'daily', queriesPerDay: 8 },
      { pattern: 'map_to_mitre_attack', frequency: 'daily', queriesPerDay: 12 },
      { pattern: 'search_historical_alerts', frequency: 'hourly', queriesPerDay: 25 },
    ],
  },
  {
    id: 'bob_sre',
    name: 'Bob (Senior SRE)',
    role: 'sre',
    skillLevel: 'senior',
    behaviors: [
      { pattern: 'monitor_service_performance', frequency: 'continuous', queriesPerDay: 50 },
      { pattern: 'investigate_anomalies', frequency: 'hourly', queriesPerDay: 15 },
      { pattern: 'trace_errors', frequency: 'daily', queriesPerDay: 10 },
      { pattern: 'analyze_latency_spikes', frequency: 'daily', queriesPerDay: 8 },
      { pattern: 'check_service_health', frequency: 'hourly', queriesPerDay: 20 },
    ],
  },
  {
    id: 'charlie_dev',
    name: 'Charlie (Junior Developer)',
    role: 'developer',
    skillLevel: 'junior',
    behaviors: [
      { pattern: 'debug_application_errors', frequency: 'daily', queriesPerDay: 12 },
      { pattern: 'analyze_performance', frequency: 'weekly', queriesPerDay: 3 },
      { pattern: 'search_logs_for_exceptions', frequency: 'daily', queriesPerDay: 8 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN DATA GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateAESOPDemoData() {
  const esClient = new Client({
    node: ES_URL,
    auth: {
      username: ES_USERNAME,
      password: ES_PASSWORD,
    },
  });

  console.log('🚀 AESOP Demo Data Generator Starting...\n');

  try {
    // 1. Load existing episode data (ep1-ep8)
    await loadEpisodeData(esClient);

    // 2. Generate additional MITRE scenarios
    await generateMITREScenarios(esClient);

    // 3. Generate persona query behaviors
    await generatePersonaBehaviors(esClient);

    // 4. Generate APM traces
    await generateAPMTraces(esClient);

    // 5. Generate logs
    await generateLogs(esClient);

    // 6. Generate metrics
    await generateMetrics(esClient);

    console.log('\n✅ AESOP Demo Data Generation Complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Security alerts: ~${await countDocs(esClient, '.alerts-*')}`);
    console.log(`  - Persona behaviors: ~${await countDocs(esClient, '.aesop-persona-behaviors')}`);
    console.log(`  - APM traces: ~${await countDocs(esClient, 'traces-apm*')}`);
    console.log(`  - Logs: ~${await countDocs(esClient, 'logs-*')}`);
    console.log(`  - Metrics: ~${await countDocs(esClient, 'metrics-*')}`);
  } catch (error) {
    console.error('❌ Error generating demo data:', error);
    throw error;
  } finally {
    await esClient.close();
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. LOAD EXISTING EPISODE DATA (ep1-ep8)
// ═══════════════════════════════════════════════════════════════

async function loadEpisodeData(esClient: Client) {
  console.log('📁 Loading existing episode data (ep1-ep8)...');

  const episodesDir = path.join(__dirname, '../../data/episodes/attacks');
  const files = fs.readdirSync(episodesDir).filter((f) => f.endsWith('.ndjson.gz'));

  for (const file of files) {
    const filePath = path.join(episodesDir, file);
    const compressed = fs.readFileSync(filePath);
    const decompressed = await gunzip(compressed);
    const lines = decompressed.toString().split('\n').filter(Boolean);

    const episodeName = file.replace('.ndjson.gz', '');
    console.log(`  Loading ${episodeName}: ${lines.length} documents`);

    // Determine target index from data
    const firstDoc = JSON.parse(lines[0]);
    const isAlert = file.includes('alerts');
    const index = isAlert ? '.internal.alerts-security.alerts-default-000001' : 'logs-endpoint.events.process-default';

    // Bulk index
    const body = lines.flatMap((line) => [
      { index: { _index: index } },
      JSON.parse(line),
    ]);

    if (body.length > 0) {
      await esClient.bulk({ body, refresh: false });
    }
  }

  console.log('  ✅ Episode data loaded\n');
}

// ═══════════════════════════════════════════════════════════════
// 2. GENERATE ADDITIONAL MITRE ATT&CK SCENARIOS
// ═══════════════════════════════════════════════════════════════

async function generateMITREScenarios(esClient: Client) {
  console.log('🎯 Generating MITRE ATT&CK scenarios (all 14 tactics)...');

  const scenarios: any[] = [];

  for (const tactic of MITRE_TACTICS) {
    for (const technique of tactic.techniques) {
      // Generate 3-5 alerts per technique
      const alertCount = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < alertCount; i++) {
        scenarios.push(generateMITREAlert(tactic, technique, i));
      }
    }
  }

  console.log(`  Generated ${scenarios.length} MITRE-aligned alerts`);

  // Bulk index
  const body = scenarios.flatMap((alert) => [
    { index: { _index: '.internal.alerts-security.alerts-default-000001' } },
    alert,
  ]);

  await esClient.bulk({ body, refresh: false });
  console.log('  ✅ MITRE scenarios indexed\n');
}

function generateMITREAlert(tactic: any, technique: string, index: number): any {
  const now = new Date();
  const timestamp = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days

  // Severity distribution: Critical (5%), High (15%), Medium (30%), Low (50%)
  const severities = ['critical', 'high', 'high', 'medium', 'medium', 'medium', 'low', 'low', 'low', 'low'];
  const severity = severities[Math.floor(Math.random() * severities.length)];

  return {
    '@timestamp': timestamp.toISOString(),
    'kibana.alert.rule.name': `${tactic.name} - ${technique}`,
    'kibana.alert.severity': severity,
    'kibana.alert.risk_score': severity === 'critical' ? 90 : severity === 'high' ? 75 : severity === 'medium' ? 50 : 25,
    'kibana.alert.workflow_status': 'open',
    'event.kind': 'signal',
    'event.category': ['malware', 'intrusion_detection'],
    'threat.tactic.id': tactic.id,
    'threat.tactic.name': tactic.name,
    'threat.technique.id': technique,
    'threat.technique.name': getTechniqueName(technique),
    'host.name': `host-${Math.floor(Math.random() * 50)}`,
    'host.ip': `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    'user.name': `user${Math.floor(Math.random() * 100)}`,
    'process.name': getProcessForTechnique(technique),
    'process.command_line': getCommandLineForTechnique(technique),
    'file.hash.sha256': generateRandomHash(),
    'source.ip': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    '_id': `${technique}-${index}-${uuidv4()}`,
  };
}

function getTechniqueName(techniqueId: string): string {
  const names: Record<string, string> = {
    'T1059': 'Command and Scripting Interpreter',
    'T1003': 'OS Credential Dumping',
    'T1071': 'Application Layer Protocol (C2)',
    'T1190': 'Exploit Public-Facing Application',
    'T1566': 'Phishing',
    'T1053': 'Scheduled Task/Job',
    // ... add more as needed
  };
  return names[techniqueId] || 'Unknown Technique';
}

function getProcessForTechnique(techniqueId: string): string {
  const processes: Record<string, string> = {
    'T1059': 'powershell.exe',
    'T1003': 'lsass.exe',
    'T1071': 'rundll32.exe',
    'T1190': 'nginx',
    // ... add more
  };
  return processes[techniqueId] || 'unknown.exe';
}

function getCommandLineForTechnique(techniqueId: string): string {
  const commands: Record<string, string> = {
    'T1059': 'powershell.exe -enc JABhAD0AJwBoAGUAbABsAG8AJw==',
    'T1003': 'rundll32.exe C:\\windows\\system32\\comsvcs.dll MiniDump',
    'T1071': 'rundll32.exe http://malicious.com/beacon',
    // ... add more
  };
  return commands[techniqueId] || '';
}

function generateRandomHash(): string {
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// ═══════════════════════════════════════════════════════════════
// 3. GENERATE PERSONA QUERY BEHAVIORS
// ═══════════════════════════════════════════════════════════════

async function generatePersonaBehaviors(esClient: Client) {
  console.log('👥 Generating persona query behaviors...');

  // Create index for persona behaviors
  await esClient.indices.create({
    index: '.aesop-persona-behaviors',
    body: {
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          persona_id: { type: 'keyword' },
          persona_name: { type: 'text' },
          persona_role: { type: 'keyword' },
          query_type: { type: 'keyword' },
          target_index: { type: 'keyword' },
          query_body: { type: 'object', enabled: false },
          entity_queried: { type: 'keyword' },
          result_count: { type: 'long' },
          duration_ms: { type: 'long' },
        },
      },
    },
  }).catch(() => {}); // Ignore if exists

  const behaviors: any[] = [];

  // Simulate 30 days of queries for each persona
  const daysToSimulate = 30;

  for (const persona of PERSONAS) {
    console.log(`  Simulating ${persona.name}...`);

    for (let day = 0; day < daysToSimulate; day++) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - daysToSimulate + day);

      for (const behavior of persona.behaviors) {
        const queriesForDay = behavior.queriesPerDay;

        for (let q = 0; q < queriesForDay; q++) {
          const queryTime = new Date(dayStart);
          queryTime.setHours(8 + Math.floor(Math.random() * 10)); // 8am-6pm
          queryTime.setMinutes(Math.floor(Math.random() * 60));

          behaviors.push(generatePersonaQuery(persona, behavior, queryTime));
        }
      }
    }
  }

  console.log(`  Generated ${behaviors.length} persona query events`);

  // Bulk index (batch of 1000)
  for (let i = 0; i < behaviors.length; i += 1000) {
    const batch = behaviors.slice(i, i + 1000);
    const body = batch.flatMap((b) => [
      { index: { _index: '.aesop-persona-behaviors' } },
      b,
    ]);
    await esClient.bulk({ body, refresh: false });
  }

  console.log('  ✅ Persona behaviors indexed\n');
}

function generatePersonaQuery(persona: Persona, behavior: QueryBehavior, timestamp: Date): any {
  const queryTemplates = getQueryTemplatesForBehavior(behavior.pattern);
  const template = queryTemplates[Math.floor(Math.random() * queryTemplates.length)];

  return {
    '@timestamp': timestamp.toISOString(),
    persona_id: persona.id,
    persona_name: persona.name,
    persona_role: persona.role,
    skill_level: persona.skillLevel,
    query_type: behavior.pattern,
    target_index: template.index,
    query_body: template.query,
    entity_queried: template.entity,
    result_count: Math.floor(Math.random() * 100),
    duration_ms: 100 + Math.floor(Math.random() * 2000),
  };
}

function getQueryTemplatesForBehavior(pattern: string): Array<{ index: string; query: any; entity: string }> {
  const templates: Record<string, Array<{ index: string; query: any; entity: string }>> = {
    triage_high_severity_alerts: [
      {
        index: '.alerts-security.alerts-*',
        query: {
          bool: {
            must: [
              { term: { 'kibana.alert.workflow_status': 'open' } },
              { terms: { 'kibana.alert.severity': ['high', 'critical'] } },
            ],
          },
        },
        entity: 'alert',
      },
    ],
    investigate_suspicious_ips: [
      {
        index: '.alerts-security.alerts-*',
        query: {
          bool: {
            must: [
              { range: { 'kibana.alert.risk_score': { gte: 75 } } },
              { exists: { field: 'source.ip' } },
            ],
          },
        },
        entity: 'ip',
      },
    ],
    correlate_related_alerts: [
      {
        index: '.alerts-security.alerts-*',
        query: {
          bool: {
            must: [
              { term: { 'host.name': 'host-placeholder' } },
              { range: { '@timestamp': { gte: 'now-24h' } } },
            ],
          },
        },
        entity: 'host',
      },
    ],
    monitor_service_performance: [
      {
        index: 'metrics-apm*',
        query: {
          bool: {
            must: [
              { term: { 'metricset.name': 'transaction' } },
              { range: { '@timestamp': { gte: 'now-1h' } } },
            ],
          },
        },
        entity: 'service',
      },
    ],
    trace_errors: [
      {
        index: 'traces-apm*',
        query: {
          bool: {
            must: [
              { term: { 'error.exception.handled': false } },
              { range: { '@timestamp': { gte: 'now-24h' } } },
            ],
          },
        },
        entity: 'trace',
      },
    ],
    debug_application_errors: [
      {
        index: 'logs-*',
        query: {
          bool: {
            must: [
              { term: { 'log.level': 'ERROR' } },
              { range: { '@timestamp': { gte: 'now-1h' } } },
            ],
          },
        },
        entity: 'log',
      },
    ],
  };

  return templates[pattern] || [
    {
      index: '.alerts-*',
      query: { match_all: {} },
      entity: 'unknown',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// 4. GENERATE APM TRACES
// ═══════════════════════════════════════════════════════════════

async function generateAPMTraces(esClient: Client) {
  console.log('📊 Generating APM traces (distributed tracing)...');

  const services = [
    'auth-service',
    'api-gateway',
    'user-service',
    'data-processor',
    'ml-service',
    'notification-service',
    'payment-service',
    'inventory-service',
    'analytics-service',
    'reporting-service',
  ];

  const spans: any[] = [];

  // Generate 10,000 traces over 10 days
  const traceCount = 10000;
  const daysBack = 10;

  for (let i = 0; i < traceCount; i++) {
    const traceId = uuidv4();
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * daysBack));

    const service = services[Math.floor(Math.random() * services.length)];

    // Root span
    const rootSpan = {
      '@timestamp': timestamp.toISOString(),
      'trace.id': traceId,
      'span.id': uuidv4(),
      'parent.id': undefined,
      name: `HTTP GET /api/${service}`,
      kind: 'SERVER',
      'service.name': service,
      duration: 100 + Math.random() * 500, // 100-600ms
      status: Math.random() > 0.05 ? 'OK' : 'ERROR', // 95% success rate
      attributes: {
        'http.method': 'GET',
        'http.url': `/api/${service}`,
        'http.status_code': Math.random() > 0.05 ? 200 : 500,
      },
    };

    spans.push(rootSpan);

    // Child spans (2-5 per trace)
    const childCount = 2 + Math.floor(Math.random() * 4);
    for (let c = 0; c < childCount; c++) {
      spans.push({
        '@timestamp': new Date(timestamp.getTime() + c * 50).toISOString(),
        'trace.id': traceId,
        'span.id': uuidv4(),
        'parent.id': rootSpan['span.id'],
        name: `DB Query`,
        kind: 'CLIENT',
        'service.name': service,
        duration: 10 + Math.random() * 100,
        status: 'OK',
        attributes: {
          'db.system': 'elasticsearch',
          'db.operation': 'search',
        },
      });
    }
  }

  console.log(`  Generated ${spans.length} trace spans`);

  // Bulk index
  for (let i = 0; i < spans.length; i += 1000) {
    const batch = spans.slice(i, i + 1000);
    const body = batch.flatMap((span) => [
      { index: { _index: 'traces-apm.sampled-default' } },
      span,
    ]);
    await esClient.bulk({ body, refresh: false });
  }

  console.log('  ✅ APM traces indexed\n');
}

// ═══════════════════════════════════════════════════════════════
// 5. GENERATE LOGS
// ═══════════════════════════════════════════════════════════════

async function generateLogs(esClient: Client) {
  console.log('📝 Generating logs (structured + unstructured)...');

  const logs: any[] = [];
  const logCount = 50000; // 50K logs
  const daysBack = 30;

  const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  const logMessages = [
    'User authentication successful',
    'Database connection established',
    'Cache miss for key',
    'Rate limit exceeded',
    'Unexpected null value',
    'Failed to parse JSON',
    'Permission denied',
  ];

  for (let i = 0; i < logCount; i++) {
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * daysBack));

    const level = logLevels[Math.floor(Math.random() * logLevels.length)];

    logs.push({
      '@timestamp': timestamp.toISOString(),
      'log.level': level,
      message: logMessages[Math.floor(Math.random() * logMessages.length)],
      'service.name': `service-${Math.floor(Math.random() * 10)}`,
      'host.name': `host-${Math.floor(Math.random() * 50)}`,
      'process.pid': Math.floor(Math.random() * 10000),
    });
  }

  console.log(`  Generated ${logs.length} log entries`);

  // Bulk index
  for (let i = 0; i < logs.length; i += 1000) {
    const batch = logs.slice(i, i + 1000);
    const body = batch.flatMap((log) => [
      { index: { _index: 'logs-generic-default' } },
      log,
    ]);
    await esClient.bulk({ body, refresh: false });
  }

  console.log('  ✅ Logs indexed\n');
}

// ═══════════════════════════════════════════════════════════════
// 6. GENERATE METRICS
// ═══════════════════════════════════════════════════════════════

async function generateMetrics(esClient: Client) {
  console.log('📈 Generating metrics (infrastructure + application)...');

  const metrics: any[] = [];
  const hours = 24 * 7; // 1 week of hourly metrics

  for (let h = 0; h < hours; h++) {
    const timestamp = new Date();
    timestamp.setHours(timestamp.getHours() - hours + h);

    // Infrastructure metrics
    for (let host = 0; host < 10; host++) {
      metrics.push({
        '@timestamp': timestamp.toISOString(),
        'metricset.name': 'cpu',
        'host.name': `host-${host}`,
        'system.cpu.total.pct': 0.2 + Math.random() * 0.6,
      });

      metrics.push({
        '@timestamp': timestamp.toISOString(),
        'metricset.name': 'memory',
        'host.name': `host-${host}`,
        'system.memory.used.pct': 0.4 + Math.random() * 0.4,
      });
    }
  }

  console.log(`  Generated ${metrics.length} metric documents`);

  // Bulk index
  for (let i = 0; i < metrics.length; i += 1000) {
    const batch = metrics.slice(i, i + 1000);
    const body = batch.flatMap((metric) => [
      { index: { _index': 'metrics-system.cpu-default' } },
      metric,
    ]);
    await esClient.bulk({ body, refresh: false });
  }

  console.log('  ✅ Metrics indexed\n');
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

async function countDocs(esClient: Client, index: string): Promise<number> {
  try {
    const result = await esClient.count({ index });
    return result.count;
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

if (require.main === module) {
  generateAESOPDemoData()
    .then(() => {
      console.log('\n✨ Demo environment ready for AESOP self-exploration!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to generate demo data:', error);
      process.exit(1);
    });
}
