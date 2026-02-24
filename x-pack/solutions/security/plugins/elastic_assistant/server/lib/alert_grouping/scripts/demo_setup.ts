/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Demo Setup — runs all 3 triage approaches (AG, TP, Hybrid) in separate Kibana spaces.
 *
 * Strategy: Sequential runs with alert resets between each approach.
 *   1. Create 3 Kibana spaces
 *   2. Inject 48 alerts + 2141 endpoint events
 *   3. Run Alert Grouping → results saved in ag-demo space
 *   4. Reset all alerts to fresh state
 *   5. Run Triage Prompt → results saved in tp-demo space
 *   6. Reset all alerts to fresh state
 *   7. Run Hybrid → results saved in hybrid-demo space
 *   8. Print summary with links to each space
 *
 * Usage:
 *   npx tsx demo_setup.ts \
 *     --es-url http://localhost:9200 \
 *     --kibana-url http://localhost:5601 \
 *     -u elastic -p changeme \
 *     --connector-id pmeClaudeV45SonnetUsEast1
 *
 *   # Cleanup everything
 *   npx tsx demo_setup.ts ... --cleanup
 */

import { execSync } from 'child_process';
import { resolve } from 'path';
import { ESClient, KibanaClient, parseConnectionArgs, checkCluster } from './es_client';

const SCRIPT_DIR = __dirname;
const INJECTED_TAG = 'demo-recreated';

const SPACES = [
  { id: 'ag-demo', name: 'Alert Grouping Demo', color: '#0077CC' },
  { id: 'tp-demo', name: 'Triage Prompt Demo', color: '#00BFB3' },
  { id: 'hybrid-demo', name: 'Hybrid Demo', color: '#BD271E' },
];

// ── Helpers ──

function run(scriptName: string, extraArgs: string, esArgs: string): string {
  const cmd = `npx tsx ${resolve(SCRIPT_DIR, scriptName)} ${esArgs} ${extraArgs}`;
  console.log(`    $ ${scriptName} ${extraArgs.replace(/--password \S+/, '--password ***')}`);
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600_000,
      cwd: SCRIPT_DIR,
    });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    console.error(`    FAILED: ${e.message?.split('\n')[0]?.slice(0, 150) ?? 'unknown'}`);
    return e.stdout ?? '';
  }
}

async function createSpace(
  kibana: KibanaClient,
  space: { id: string; name: string; color: string }
): Promise<void> {
  const { status } = await kibana.post('/api/spaces/space', {
    id: space.id,
    name: space.name,
    color: space.color,
    disabledFeatures: [],
  });
  console.log(
    status === 200 || status === 201
      ? `  + ${space.name} (${space.id})`
      : status === 409
      ? `  = ${space.name} already exists`
      : `  ! Failed to create ${space.id} (${status})`
  );
}

async function resetAlerts(es: ESClient): Promise<void> {
  const { body } = await es.post(
    '/.alerts-security.alerts-*/_update_by_query?refresh=true&conflicts=proceed',
    {
      query: { term: { tags: INJECTED_TAG } },
      script: {
        source: `
        ctx._source['kibana.alert.workflow_status'] = 'open';
        ctx._source['kibana.alert.workflow_tags'] = [];
        ctx._source['kibana.alert.case_ids'] = [];
        ctx._source['kibana.alert.status'] = 'active';
      `,
        lang: 'painless',
      },
    }
  );
  const updated =
    typeof body === 'object' && body !== null
      ? ((body as Record<string, unknown>).updated as number) ?? 0
      : 0;
  console.log(`  Reset ${updated} alerts to open/fresh state`);
}

async function deleteCasesInSpace(kibana: KibanaClient, spaceId: string): Promise<number> {
  const spaceKbn = new KibanaClient({
    baseUrl: (kibana as any).baseUrl,
    user: (kibana as any).user,
    password: (kibana as any).password,
    spaceId,
  });
  // Actually we need the raw baseUrl. Let's just use the main kibana with manual space prefix.
  const { status, body } = await kibana.get(`/s/${spaceId}/api/cases/_find?perPage=100`);
  if (status !== 200 || typeof body !== 'object' || body === null) return 0;
  const cases = ((body as Record<string, unknown>).cases ?? []) as Array<Record<string, unknown>>;
  for (const c of cases) {
    const cid = c.id as string;
    await kibana.request(
      'DELETE',
      `/s/${spaceId}/api/cases?ids=${encodeURIComponent(`["${cid}"]`)}`
    );
  }
  return cases.length;
}

// ── Alert Grouping ──

async function runAG(
  kibana: KibanaClient,
  connectorId: string,
  spaceId: string
): Promise<{ durationMs: number; cases: number; ads: number; details: string[] }> {
  console.log(`\n  ── Alert Grouping (space: ${spaceId}) ──`);
  const t0 = Date.now();
  const details: string[] = [];

  // Create workflow
  const { status: wfSt, body: wfBd } = await kibana.post(
    `/s/${spaceId}/api/security/alert_grouping/workflow`,
    {
      name: 'demo-ag',
      description: 'Demo AG',
      enabled: true,
      schedule: { interval: '5m' },
      alertFilter: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        excludeTags: ['llm-triaged'],
        includeStatuses: ['open'],
        maxAlertsPerRun: 200,
      },
      groupingConfig: {
        strategy: 'temporal',
        entityTypes: [
          { type: 'host.name', sourceFields: ['host.name'], weight: 1, required: true },
          { type: 'user.name', sourceFields: ['user.name'], weight: 0.5 },
          { type: 'process.name', sourceFields: ['process.name'], weight: 0.3 },
        ],
        threshold: 0.3,
        timeWindow: '4h',
        createNewCaseIfNoMatch: true,
        maxAlertsPerCase: 200,
        mergeSimilarCases: true,
        mergeThreshold: 0.7,
      },
      attackDiscoveryConfig: {
        enabled: true,
        mode: 'full',
        triggerOnAlertCount: 1,
        attachToCase: true,
        validateAlertRelevance: true,
        enableCaseMerging: true,
      },
    }
  );

  let wfId = '';
  if (wfSt === 200 || wfSt === 201) {
    wfId = ((wfBd as Record<string, unknown>).id as string) ?? '';
    console.log(`    Workflow: ${wfId}`);
  } else {
    const { body: lb } = await kibana.get(`/s/${spaceId}/api/security/alert_grouping/workflow`);
    const data = ((lb as Record<string, unknown>)?.data ?? []) as Array<Record<string, unknown>>;
    wfId = data.length > 0 ? (data[0].id as string) : '';
    if (wfId) console.log(`    Reusing workflow: ${wfId}`);
    else {
      console.error('    No workflow!');
      return { durationMs: Date.now() - t0, cases: 0, ads: 0, details };
    }
  }

  // Run grouping
  const { body: runBd } = await kibana.post(
    `/s/${spaceId}/api/security/alert_grouping/workflow/${wfId}/_run`,
    {
      time_range: { start: 'now-24h', end: 'now' },
    }
  );
  const m = ((runBd as Record<string, unknown>)?.metrics ?? {}) as Record<string, unknown>;
  console.log(`    Grouped: ${m.casesCreated ?? 0} cases, ${m.alertsProcessed ?? 0} alerts`);

  // Fetch cases and run AD
  const { body: cb } = await kibana.get(
    `/s/${spaceId}/api/cases/_find?perPage=100&sortField=createdAt&sortOrder=asc`
  );
  const cases = ((cb as Record<string, unknown>)?.cases ?? []) as Array<Record<string, unknown>>;
  let adsTotal = 0;

  for (const c of cases) {
    const caseId = c.id as string;
    const title = c.title as string;
    const alertCount = (c.totalAlerts as number) ?? 0;
    console.log(`    AD → "${title}" (${alertCount} alerts)...`);

    const adT0 = Date.now();
    const { status: adSt, body: adBd } = await kibana.post(
      `/s/${spaceId}/api/security/alert_grouping/cases/${caseId}/_generate_attack_discovery`,
      { connectorId, actionTypeId: '.bedrock' }
    );
    const adMs = Date.now() - adT0;

    if (adSt === 200 && typeof adBd === 'object' && adBd !== null) {
      const ads = ((adBd as Record<string, unknown>).attack_discoveries ?? []) as Array<
        Record<string, unknown>
      >;
      const kept = (adBd as Record<string, unknown>).alerts_in_discoveries ?? 0;
      const rej = (adBd as Record<string, unknown>).alerts_rejected ?? 0;
      if (ads.length > 0) {
        adsTotal++;
        const adTitle = (ads[0].title as string)?.slice(0, 60) ?? '';
        console.log(
          `      ✓ "${adTitle}" — kept ${kept}, rejected ${rej} (${(adMs / 1000).toFixed(1)}s)`
        );
        details.push(`${title}: AD="${adTitle}", kept=${kept}, rejected=${rej}`);
      } else {
        console.log(`      ○ No discovery (${(adMs / 1000).toFixed(1)}s)`);
        details.push(`${title}: no AD (all ${alertCount} rejected)`);
      }
    } else {
      console.log(`      ✗ Failed (${adSt})`);
    }
  }

  const dur = Date.now() - t0;
  console.log(`    Done: ${cases.length} cases, ${adsTotal} ADs (${(dur / 1000).toFixed(0)}s)`);
  return { durationMs: dur, cases: cases.length, ads: adsTotal, details };
}

// ── Triage Prompt ──

async function runTP(
  kibana: KibanaClient,
  connectorId: string,
  spaceId: string,
  baseArgs: string
): Promise<{ durationMs: number; cases: number; details: string[] }> {
  console.log(`\n  ── Triage Prompt (space: ${spaceId}) ──`);
  const t0 = Date.now();

  const output = run(
    'triage_runner.ts',
    `--connector-id ${connectorId} --space ${spaceId} --output /tmp/demo_tp.json`,
    baseArgs
  );

  const details: string[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('→')) {
      details.push(trimmed);
      console.log(`    ${trimmed}`);
    }
    if (
      trimmed.includes('Alerts processed') ||
      trimmed.includes('Classifications') ||
      trimmed.includes('Cases created')
    ) {
      console.log(`    ${trimmed}`);
    }
  }

  const dur = Date.now() - t0;
  // Count cases
  const { body: cb } = await kibana.get(`/s/${spaceId}/api/cases/_find?perPage=1`);
  const totalCases = ((cb as Record<string, unknown>)?.total as number) ?? 0;
  console.log(`    Done: ${totalCases} cases (${(dur / 1000).toFixed(0)}s)`);
  return { durationMs: dur, cases: totalCases, details };
}

// ── Hybrid ──

async function runHybrid(
  kibana: KibanaClient,
  connectorId: string,
  spaceId: string,
  baseArgs: string
): Promise<{ durationMs: number; cases: number; ads: number; details: string[] }> {
  console.log(`\n  ── Hybrid (space: ${spaceId}) ──`);
  const t0 = Date.now();

  // Create workflow
  const { status: wfSt, body: wfBd } = await kibana.post(
    `/s/${spaceId}/api/security/alert_grouping/workflow`,
    {
      name: 'demo-hybrid',
      description: 'Demo Hybrid',
      enabled: true,
      schedule: { interval: '5m' },
      alertFilter: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        excludeTags: ['llm-triaged'],
        includeStatuses: ['open'],
        maxAlertsPerRun: 200,
      },
      groupingConfig: {
        strategy: 'temporal',
        entityTypes: [
          { type: 'host.name', sourceFields: ['host.name'], weight: 1, required: true },
          { type: 'user.name', sourceFields: ['user.name'], weight: 0.5 },
          { type: 'process.name', sourceFields: ['process.name'], weight: 0.3 },
        ],
        threshold: 0.3,
        timeWindow: '4h',
        createNewCaseIfNoMatch: true,
        maxAlertsPerCase: 200,
        mergeSimilarCases: true,
        mergeThreshold: 0.7,
      },
      attackDiscoveryConfig: {
        enabled: true,
        mode: 'full',
        triggerOnAlertCount: 1,
        attachToCase: true,
        validateAlertRelevance: true,
        enableCaseMerging: true,
      },
    }
  );

  let wfId = '';
  if (wfSt === 200 || wfSt === 201) {
    wfId = ((wfBd as Record<string, unknown>).id as string) ?? '';
  } else {
    const { body: lb } = await kibana.get(`/s/${spaceId}/api/security/alert_grouping/workflow`);
    const data = ((lb as Record<string, unknown>)?.data ?? []) as Array<Record<string, unknown>>;
    wfId = data.length > 0 ? (data[0].id as string) : '';
  }

  if (!wfId) {
    console.error('    No workflow!');
    return { durationMs: Date.now() - t0, cases: 0, ads: 0, details: [] };
  }
  console.log(`    Workflow: ${wfId}`);

  const output = run(
    'hybrid_runner.ts',
    `--connector-id ${connectorId} --workflow-id ${wfId} --space ${spaceId} --output /tmp/demo_hybrid.json`,
    baseArgs
  );

  const details: string[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('→') ||
      trimmed.includes('MALICIOUS') ||
      trimmed.includes('UNKNOWN') ||
      trimmed.includes('BENIGN')
    ) {
      details.push(trimmed);
      console.log(`    ${trimmed}`);
    }
    if (
      trimmed.includes('Cases:') ||
      trimmed.includes('Classifications') ||
      trimmed.includes('AD triggered') ||
      trimmed.includes('Discoveries')
    ) {
      console.log(`    ${trimmed}`);
    }
  }

  const dur = Date.now() - t0;
  const { body: cb } = await kibana.get(`/s/${spaceId}/api/cases/_find?perPage=1`);
  const totalCases = ((cb as Record<string, unknown>)?.total as number) ?? 0;
  console.log(`    Done: ${totalCases} cases (${(dur / 1000).toFixed(0)}s)`);
  return { durationMs: dur, cases: totalCases, ads: 0, details };
}

// ── Cleanup ──

async function cleanup(es: ESClient, kibana: KibanaClient, esArgs: string): Promise<void> {
  console.log(`\n═══ Cleanup ═══\n`);
  for (const sp of SPACES) {
    const n = await deleteCasesInSpace(kibana, sp.id);
    console.log(`  ${sp.id}: deleted ${n} cases`);
  }
  // Also default space
  const n0 = await deleteCasesInSpace(kibana, 'default');
  if (n0 > 0) console.log(`  default: deleted ${n0} cases`);

  await es.post('/.alerts-security.alerts-*/_delete_by_query?refresh=true', {
    query: { term: { tags: INJECTED_TAG } },
  });
  console.log(`  Deleted demo alerts`);
  run('recreate_endpoint_events.ts', '--cleanup', esArgs);
  console.log(`  Deleted endpoint events`);

  for (const sp of SPACES) {
    await kibana.request('DELETE', `/api/spaces/space/${sp.id}`);
    console.log(`  Deleted space ${sp.id}`);
  }
}

// ── Main ──

async function main(): Promise<void> {
  const args = parseConnectionArgs(process.argv);
  const connectorId = args.extra['connector-id'] ?? '';
  const doCleanup = args.flags.has('cleanup');

  if (!args.esUrl) {
    console.error('--es-url required');
    process.exit(1);
  }
  if (!args.kibanaUrl) {
    args.kibanaUrl = args.esUrl.replace(/:\d+/, ':5601');
  }

  const es = new ESClient({
    baseUrl: args.esUrl,
    apiKey: args.apiKey,
    user: args.user,
    password: args.password,
  });
  const kibana = new KibanaClient({
    baseUrl: args.kibanaUrl!,
    apiKey: args.apiKey,
    user: args.user,
    password: args.password,
  });

  // ES-only args for scripts that don't accept --kibana-url
  const esArgParts: string[] = [`--es-url ${args.esUrl}`];
  if (args.apiKey) esArgParts.push(`--api-key ${args.apiKey}`);
  if (args.user) esArgParts.push(`-u ${args.user}`);
  if (args.password) esArgParts.push(`-p ${args.password}`);
  if (args.insecure) esArgParts.push('--insecure');
  const esArgs = esArgParts.join(' ');

  // Full args for scripts that need both ES + Kibana
  const fullArgs = `${esArgs} --kibana-url ${args.kibanaUrl}`;

  console.log(`\n╔═══════════════════════════════════════════════════╗`);
  console.log(`║  Alert Triage Demo — 3 Approaches Side by Side    ║`);
  console.log(`╚═══════════════════════════════════════════════════╝\n`);
  console.log(`  ES:        ${args.esUrl}`);
  console.log(`  Kibana:    ${args.kibanaUrl}`);
  console.log(`  Connector: ${connectorId || '(needed for LLM calls)'}`);

  await checkCluster(es);

  if (doCleanup) {
    await cleanup(es, kibana, esArgs);
    return;
  }
  if (!connectorId) {
    console.error('--connector-id required');
    process.exit(1);
  }

  const T0 = Date.now();

  // ── Step 1: Spaces ──
  console.log(`\n── Creating Kibana Spaces ──`);
  for (const sp of SPACES) await createSpace(kibana, sp);

  // ── Step 2: Inject data ──
  console.log(`\n── Injecting demo data ──`);
  const alertOut = run('recreate_demo_alerts.ts', '', esArgs);
  for (const l of alertOut.split('\n')) {
    if (l.includes('Successfully') || l.includes('Time range:')) console.log(`  ${l.trim()}`);
  }
  const evtOut = run('recreate_endpoint_events.ts', '', esArgs);
  for (const l of evtOut.split('\n')) {
    if (l.includes('Successfully')) console.log(`  ${l.trim()}`);
  }

  // ── Step 3: Alert Grouping ──
  const agResult = await runAG(kibana, connectorId, 'ag-demo');

  // ── Step 4: Reset alerts ──
  console.log(`\n── Resetting alerts for Triage Prompt ──`);
  await resetAlerts(es);

  // ── Step 5: Triage Prompt ──
  const tpResult = await runTP(kibana, connectorId, 'tp-demo', fullArgs);

  // ── Step 6: Reset alerts ──
  console.log(`\n── Resetting alerts for Hybrid ──`);
  await resetAlerts(es);

  // ── Step 7: Hybrid ──
  const hybridResult = await runHybrid(kibana, connectorId, 'hybrid-demo', fullArgs);

  // ── Summary ──
  const total = Date.now() - T0;
  console.log(`\n╔═══════════════════════════════════════════════════╗`);
  console.log(`║                 Demo Complete                      ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
  console.log(`\n  Total: ${(total / 1000).toFixed(0)}s\n`);
  console.log(`  ┌──────────────────┬──────────┬───────┬──────┐`);
  console.log(`  │ Approach         │ Duration │ Cases │  ADs │`);
  console.log(`  ├──────────────────┼──────────┼───────┼──────┤`);
  console.log(
    `  │ Alert Grouping   │ ${String(Math.round(agResult.durationMs / 1000)).padStart(
      6
    )}s │ ${String(agResult.cases).padStart(5)} │ ${String(agResult.ads).padStart(4)} │`
  );
  console.log(
    `  │ Triage Prompt    │ ${String(Math.round(tpResult.durationMs / 1000)).padStart(
      6
    )}s │ ${String(tpResult.cases).padStart(5)} │  N/A │`
  );
  console.log(
    `  │ Hybrid           │ ${String(Math.round(hybridResult.durationMs / 1000)).padStart(
      6
    )}s │ ${String(hybridResult.cases).padStart(5)} │ ${String(hybridResult.ads).padStart(4)} │`
  );
  console.log(`  └──────────────────┴──────────┴───────┴──────┘`);
  console.log(`\n  View results in Kibana:`);
  console.log(`    Alert Grouping: ${args.kibanaUrl}/s/ag-demo/app/security/cases`);
  console.log(`    Triage Prompt:  ${args.kibanaUrl}/s/tp-demo/app/security/cases`);
  console.log(`    Hybrid:         ${args.kibanaUrl}/s/hybrid-demo/app/security/cases`);
  console.log(`\n  Cleanup:`);
  console.log(
    `    npx tsx demo_setup.ts ${esArgs} --kibana-url ${args.kibanaUrl} --connector-id ${connectorId} --cleanup`
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
