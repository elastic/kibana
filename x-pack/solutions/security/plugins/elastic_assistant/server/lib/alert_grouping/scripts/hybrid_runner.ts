/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hybrid Triage Runner — combines Alert Grouping + Triage Classification + Selective AD.
 *
 * Stages:
 *   1. Alert Grouping:  Trigger the alert grouping workflow to cluster alerts into cases
 *   2. Triage per case: For each case, gather context from its alerts and classify via LLM
 *                       (benign / unknown / malicious + confidence score)
 *   3. Selective AD:    Only trigger Attack Discovery for cases classified as malicious or unknown
 *   4. Report:          Collect all metrics and output comparison-ready JSON
 *
 * Usage:
 *   npx tsx hybrid_runner.ts \
 *     --es-url http://localhost:9200 \
 *     --kibana-url http://localhost:5601 \
 *     -u elastic -p changeme \
 *     --connector-id pmeClaudeV45SonnetUsEast1 \
 *     --workflow-id <workflow-uuid> \
 *     --output /tmp/hybrid_results.json
 */

import { writeFileSync } from 'fs';
import { ESClient, KibanaClient, parseConnectionArgs, checkCluster } from './es_client';

// ── Types ──

interface CaseInfo {
  id: string;
  title: string;
  alertCount: number;
  hostNames: string[];
  ruleNames: string[];
  tactics: string[];
}

interface CaseClassification {
  classification: 'benign' | 'unknown' | 'malicious';
  confidenceScore: number;
  summary: string;
  attackChain: string;
  iocs: string[];
  mitreTactics: string[];
  remediationSteps: string[];
  analystNotes: string;
}

interface CaseResult {
  caseId: string;
  caseTitle: string;
  alertCount: number;
  hosts: string[];
  classification: CaseClassification;
  classificationDurationMs: number;
  classificationTokens: { input: number; output: number };
  adTriggered: boolean;
  adDurationMs: number;
  adDiscoveries: number;
  adAlertsKept: number;
  adAlertsRejected: number;
  adTitle: string;
}

interface HybridReport {
  startedAt: string;
  completedAt: string;
  stages: {
    grouping: { durationMs: number; casesCreated: number; alertsProcessed: number };
    classification: {
      durationMs: number;
      llmCalls: number;
      inputTokens: number;
      outputTokens: number;
    };
    attackDiscovery: {
      durationMs: number;
      llmCalls: number;
      casesWithAd: number;
      casesSkipped: number;
    };
  };
  totalDurationMs: number;
  totalTokens: { input: number; output: number };
  totalLlmCalls: number;
  cases: CaseResult[];
  classifications: { benign: number; unknown: number; malicious: number };
}

// ── Stage 1: Alert Grouping ──

async function runGrouping(
  kibana: KibanaClient,
  workflowId: string
): Promise<{ durationMs: number; casesCreated: number; alertsProcessed: number }> {
  console.log(`\n── Stage 1: Alert Grouping ──`);
  const start = Date.now();

  const { status, body } = await kibana.post(
    `/api/security/alert_grouping/workflow/${workflowId}/_run`,
    {
      time_range: { start: 'now-24h', end: 'now' },
    }
  );

  const durationMs = Date.now() - start;

  if (status !== 200 || typeof body !== 'object' || body === null) {
    console.error(`  Grouping failed (${status}): ${JSON.stringify(body).slice(0, 300)}`);
    return { durationMs, casesCreated: 0, alertsProcessed: 0 };
  }

  const result = body as Record<string, unknown>;
  const metrics = (result.metrics ?? {}) as Record<string, unknown>;
  const casesCreated = (metrics.casesCreated as number) ?? 0;
  const alertsProcessed = (metrics.alertsProcessed as number) ?? 0;

  console.log(`  Duration:    ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  Cases:       ${casesCreated}`);
  console.log(`  Alerts:      ${alertsProcessed}`);

  return { durationMs, casesCreated, alertsProcessed };
}

// ── Fetch case info ──

async function fetchCases(kibana: KibanaClient): Promise<CaseInfo[]> {
  const { status, body } = await kibana.get(
    '/api/cases/_find?perPage=100&sortField=createdAt&sortOrder=asc'
  );

  if (status !== 200 || typeof body !== 'object' || body === null) return [];

  const cases = ((body as Record<string, unknown>).cases ?? []) as Array<Record<string, unknown>>;

  return cases.map((c) => ({
    id: c.id as string,
    title: c.title as string,
    alertCount: (c.totalAlerts as number) ?? 0,
    hostNames: [],
    ruleNames: [],
    tactics: [],
  }));
}

async function enrichCaseWithAlertContext(
  es: ESClient,
  kibana: KibanaClient,
  caseInfo: CaseInfo
): Promise<{
  representativeAlert: Record<string, unknown> | null;
  relatedAlerts: Array<{ ruleName: string; severity: string; timestamp: string }>;
  hostNames: string[];
  ruleNames: string[];
  tactics: string[];
  processTree: Array<{ processName: string; commandLine: string; parentName: string }>;
  networkActivity: Array<{ destIp: string; destPort: number; processName: string }>;
}> {
  // Get alert IDs from case
  const { status, body } = await es.post('/.alerts-security.alerts-*/_search', {
    size: 100,
    query: { term: { 'kibana.alert.case_ids': caseInfo.id } },
    sort: [{ 'kibana.alert.risk_score': 'desc' }],
    _source: [
      '@timestamp',
      'kibana.alert.rule.name',
      'kibana.alert.severity',
      'kibana.alert.risk_score',
      'kibana.alert.reason',
      'host.name',
      'user.name',
      'agent.id',
      'process.name',
      'process.command_line',
      'process.parent.name',
      'kibana.alert.rule.threat',
    ],
  });

  if (status !== 200 || typeof body !== 'object' || body === null) {
    return {
      representativeAlert: null,
      relatedAlerts: [],
      hostNames: [],
      ruleNames: [],
      tactics: [],
      processTree: [],
      networkActivity: [],
    };
  }

  const hits = (((body as Record<string, unknown>).hits as Record<string, unknown>)?.hits ??
    []) as Array<Record<string, unknown>>;
  if (hits.length === 0) {
    return {
      representativeAlert: null,
      relatedAlerts: [],
      hostNames: [],
      ruleNames: [],
      tactics: [],
      processTree: [],
      networkActivity: [],
    };
  }

  const representativeAlert = hits[0]._source as Record<string, unknown>;
  const hostNames = [
    ...new Set(
      hits
        .map((h) => {
          const src = h._source as Record<string, unknown>;
          return ((src.host as Record<string, unknown>)?.name as string) ?? '';
        })
        .filter(Boolean)
    ),
  ];

  const ruleNames = [
    ...new Set(
      hits
        .map((h) => {
          const src = h._source as Record<string, unknown>;
          return (src['kibana.alert.rule.name'] as string) ?? '';
        })
        .filter(Boolean)
    ),
  ];

  const tactics = [
    ...new Set(
      hits.flatMap((h) => {
        const src = h._source as Record<string, unknown>;
        const threat = (src['kibana.alert.rule.threat'] ?? []) as Array<Record<string, unknown>>;
        return threat
          .map((t) => ((t.tactic as Record<string, unknown>)?.name as string) ?? '')
          .filter(Boolean);
      })
    ),
  ];

  const relatedAlerts = hits.slice(1).map((h) => {
    const src = h._source as Record<string, unknown>;
    return {
      ruleName: (src['kibana.alert.rule.name'] as string) ?? '',
      severity: (src['kibana.alert.severity'] as string) ?? '',
      timestamp: (src['@timestamp'] as string) ?? '',
    };
  });

  // Get agent ID for endpoint context
  const agentId = ((representativeAlert.agent as Record<string, unknown>)?.id as string) ?? '';
  const alertTime = (representativeAlert['@timestamp'] as string) ?? '';
  let processTree: Array<{ processName: string; commandLine: string; parentName: string }> = [];
  let networkActivity: Array<{ destIp: string; destPort: number; processName: string }> = [];

  if (agentId && alertTime) {
    const windowStart = new Date(new Date(alertTime).getTime() - 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(new Date(alertTime).getTime() + 60 * 60 * 1000).toISOString();

    const [procResp, netResp] = await Promise.all([
      es.post('/logs-endpoint.events.process-*/_search', {
        size: 15,
        query: {
          bool: {
            must: [
              { term: { 'agent.id': agentId } },
              { range: { '@timestamp': { gte: windowStart, lte: windowEnd } } },
            ],
          },
        },
        _source: ['process.name', 'process.command_line', 'process.parent.name'],
        sort: [{ '@timestamp': 'asc' }],
      }),
      es.post('/logs-endpoint.events.network-*/_search', {
        size: 10,
        query: {
          bool: {
            must: [
              { term: { 'agent.id': agentId } },
              { range: { '@timestamp': { gte: windowStart, lte: windowEnd } } },
            ],
          },
        },
        _source: ['process.name', 'destination.ip', 'destination.port'],
        sort: [{ '@timestamp': 'asc' }],
      }),
    ]);

    const extractHits = (resp: { status: number; body: unknown }) => {
      if (resp.status !== 200 || typeof resp.body !== 'object' || resp.body === null) return [];
      return (((resp.body as Record<string, unknown>).hits as Record<string, unknown>)?.hits ??
        []) as Array<Record<string, unknown>>;
    };

    processTree = extractHits(procResp).map((h) => {
      const s = (h._source ?? {}) as Record<string, unknown>;
      const p = (s.process ?? {}) as Record<string, unknown>;
      const par = (p.parent ?? {}) as Record<string, unknown>;
      return {
        processName: (p.name as string) ?? '',
        commandLine: (p.command_line as string) ?? '',
        parentName: (par.name as string) ?? '',
      };
    });

    networkActivity = extractHits(netResp).map((h) => {
      const s = (h._source ?? {}) as Record<string, unknown>;
      const p = (s.process ?? {}) as Record<string, unknown>;
      const dest = (s.destination ?? {}) as Record<string, unknown>;
      return {
        processName: (p.name as string) ?? '',
        destIp: (dest.ip as string) ?? '',
        destPort: (dest.port as number) ?? 0,
      };
    });
  }

  return {
    representativeAlert,
    relatedAlerts,
    hostNames,
    ruleNames,
    tactics,
    processTree,
    networkActivity,
  };
}

// ── Stage 2: Classification ──

function buildCaseClassificationPrompt(
  caseInfo: CaseInfo,
  context: Awaited<ReturnType<typeof enrichCaseWithAlertContext>>
): string {
  const rep = context.representativeAlert;
  const repRule = rep ? (rep['kibana.alert.rule.name'] as string) ?? '' : '';
  const repReason = rep ? ((rep['kibana.alert.reason'] as string) ?? '').slice(0, 300) : '';
  const repProcess = rep ? ((rep.process as Record<string, unknown>)?.name as string) ?? '' : '';
  const repCmd = rep
    ? ((rep.process as Record<string, unknown>)?.command_line as string) ?? ''
    : '';
  const repUser = rep ? ((rep.user as Record<string, unknown>)?.name as string) ?? '' : '';
  const repSeverity = rep ? (rep['kibana.alert.severity'] as string) ?? '' : '';

  const relatedSection =
    context.relatedAlerts.length > 0
      ? `Other alerts in this case (${context.relatedAlerts.length}):\n${context.relatedAlerts
          .slice(0, 20)
          .map((a) => `  - ${a.timestamp}: ${a.ruleName} (${a.severity})`)
          .join('\n')}`
      : 'No other alerts in this case.';

  const processSection =
    context.processTree.length > 0
      ? `Process activity:\n${context.processTree
          .slice(0, 10)
          .map((p) => `  - ${p.parentName} → ${p.processName}: ${p.commandLine.slice(0, 100)}`)
          .join('\n')}`
      : 'No process data available.';

  const networkSection =
    context.networkActivity.length > 0
      ? `Network activity:\n${context.networkActivity
          .slice(0, 8)
          .map((n) => `  - ${n.processName} → ${n.destIp}:${n.destPort}`)
          .join('\n')}`
      : 'No network data available.';

  return `You are an Elastic Security triage analyst. You are reviewing a CASE containing grouped alerts, not a single alert.
Classify this case and determine if Attack Discovery analysis is warranted.

IMPORTANT: Most alert groups contain FALSE POSITIVES. Require STRONG CORROBORATING EVIDENCE for "malicious":
- Single suspicious indicators alone = "unknown"
- To classify as malicious, need: confirmed C2, persistence, credential theft, lateral movement, or defense evasion
- "benign" means normal operational activity or known false positives
- "unknown" means suspicious but insufficient evidence

## Case Overview
- Title: ${caseInfo.title}
- Alert count: ${caseInfo.alertCount}
- Hosts: ${context.hostNames.join(', ') || 'unknown'}
- MITRE Tactics: ${context.tactics.join(', ') || 'none'}
- Unique rules: ${context.ruleNames.join(', ')}

## Highest-Risk Alert
- Rule: ${repRule}
- Severity: ${repSeverity}
- User: ${repUser}
- Process: ${repProcess}: ${(repCmd ?? '').slice(0, 200)}
- Reason: ${repReason}

## Context

${relatedSection}

${processSection}

${networkSection}

## Required Output (JSON)
Respond with ONLY a JSON object:
{
  "classification": "benign" | "unknown" | "malicious",
  "confidenceScore": <0-100>,
  "summary": "<2-3 sentence summary of the case>",
  "attackChain": "<if malicious: describe the attack sequence>",
  "iocs": ["<IOCs found>"],
  "mitreTactics": ["<relevant tactics>"],
  "remediationSteps": ["<recommended actions>"],
  "analystNotes": "<reasoning for classification and whether AD is warranted>"
}`;
}

async function classifyCase(
  kibana: KibanaClient,
  connectorId: string,
  caseInfo: CaseInfo,
  context: Awaited<ReturnType<typeof enrichCaseWithAlertContext>>
): Promise<{ classification: CaseClassification; tokens: { input: number; output: number } }> {
  const prompt = buildCaseClassificationPrompt(caseInfo, context);

  const { status, body } = await kibana.post(`/api/actions/connector/${connectorId}/_execute`, {
    params: {
      subAction: 'invokeAI',
      subActionParams: {
        messages: [{ role: 'user' as const, content: prompt }],
      },
    },
  });

  if (status !== 200 || typeof body !== 'object' || body === null) {
    console.error(`  LLM call failed (${status})`);
    return {
      classification: {
        classification: 'unknown',
        confidenceScore: 0,
        summary: 'LLM classification failed',
        attackChain: '',
        iocs: [],
        mitreTactics: [],
        remediationSteps: [],
        analystNotes: `LLM call failed with status ${status}`,
      },
      tokens: { input: 0, output: 0 },
    };
  }

  const result = body as Record<string, unknown>;
  const data = result.data as Record<string, unknown> | undefined;
  const message = (data?.message as string) ?? '';

  const usage =
    (data?.usage as Record<string, unknown>) ??
    (data?.usageMetadata as Record<string, unknown>) ??
    {};
  const tokens = {
    input:
      (usage.input_tokens as number) ??
      (usage.prompt_tokens as number) ??
      (usage.promptTokenCount as number) ??
      0,
    output:
      (usage.output_tokens as number) ??
      (usage.completion_tokens as number) ??
      (usage.candidatesTokenCount as number) ??
      0,
  };

  try {
    const jsonMatch = message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { classification: JSON.parse(jsonMatch[0]) as CaseClassification, tokens };
    }
  } catch {
    /* fall through */
  }

  return {
    classification: {
      classification: 'unknown',
      confidenceScore: 0,
      summary: `Could not parse: ${message.slice(0, 100)}`,
      attackChain: '',
      iocs: [],
      mitreTactics: [],
      remediationSteps: [],
      analystNotes: 'Failed to parse LLM response',
    },
    tokens,
  };
}

// ── Stage 3: Selective Attack Discovery ──

async function triggerAttackDiscovery(
  kibana: KibanaClient,
  caseId: string,
  connectorId: string
): Promise<{
  durationMs: number;
  discoveries: number;
  alertsKept: number;
  alertsRejected: number;
  title: string;
}> {
  const start = Date.now();

  const { status, body } = await kibana.post(
    `/api/security/alert_grouping/cases/${caseId}/_generate_attack_discovery`,
    { connectorId, actionTypeId: '.bedrock' }
  );

  const durationMs = Date.now() - start;

  if (status !== 200 || typeof body !== 'object' || body === null) {
    console.error(`  AD failed (${status}): ${JSON.stringify(body).slice(0, 200)}`);
    return { durationMs, discoveries: 0, alertsKept: 0, alertsRejected: 0, title: '' };
  }

  const result = body as Record<string, unknown>;
  const ads = (result.attack_discoveries ?? []) as Array<Record<string, unknown>>;
  const alertsKept = (result.alerts_in_discoveries as number) ?? 0;
  const alertsRejected = (result.alerts_rejected as number) ?? 0;
  const title = ads.length > 0 ? (ads[0].title as string) ?? '' : '';

  return { durationMs, discoveries: ads.length, alertsKept, alertsRejected, title };
}

// ── Main ──

async function main(): Promise<void> {
  const args = parseConnectionArgs(process.argv);
  const connectorId = args.extra['connector-id'] ?? '';
  const workflowId = args.extra['workflow-id'] ?? '';
  const outputFile = args.extra.output;
  const dryRun = args.dryRun;
  const adThreshold = parseInt(args.extra['ad-threshold'] ?? '30', 10);
  const spaceId = args.extra.space ?? '';

  if (!args.esUrl) {
    console.error('ERROR: --es-url is required');
    process.exit(1);
  }
  if (!args.kibanaUrl) {
    args.kibanaUrl = args.esUrl.replace(/:\d+/, ':5601');
  }
  if (!connectorId) {
    console.error('ERROR: --connector-id is required');
    process.exit(1);
  }
  if (!workflowId) {
    console.error('ERROR: --workflow-id is required');
    process.exit(1);
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
    spaceId: spaceId || undefined,
  });

  console.log(`── Hybrid Triage Runner ──`);
  console.log(`  ES:           ${args.esUrl}`);
  console.log(`  Kibana:       ${args.kibanaUrl}`);
  console.log(`  Connector:    ${connectorId}`);
  console.log(`  Workflow:     ${workflowId}`);
  console.log(`  Space:        ${spaceId || 'default'}`);
  console.log(`  AD threshold: ${adThreshold} (skip AD if confidence of benign >= ${adThreshold})`);
  console.log(`  Dry run:      ${dryRun}`);

  console.log(`\n── Connecting ──`);
  await checkCluster(es);

  const startedAt = new Date().toISOString();
  const totalStart = Date.now();

  // ── Stage 1: Alert Grouping ──
  const groupingResult = await runGrouping(kibana, workflowId);

  // Fetch created cases
  const cases = await fetchCases(kibana);
  console.log(`\n  Cases found: ${cases.length}`);
  for (const c of cases) {
    console.log(`    ${c.id.slice(0, 8)}... "${c.title}" (${c.alertCount} alerts)`);
  }

  // ── Stage 2: Classification ──
  console.log(`\n── Stage 2: Triage Classification per Case ──`);
  const classificationStart = Date.now();
  let totalClassInputTokens = 0;
  let totalClassOutputTokens = 0;
  let classLlmCalls = 0;
  const caseResults: CaseResult[] = [];

  for (const caseInfo of cases) {
    console.log(`\n  [${caseInfo.title}] (${caseInfo.alertCount} alerts)`);

    // Enrich with alert context
    console.log(`    Gathering context...`);
    const context = await enrichCaseWithAlertContext(es, kibana, caseInfo);
    caseInfo.hostNames = context.hostNames;
    caseInfo.ruleNames = context.ruleNames;
    caseInfo.tactics = context.tactics;
    console.log(
      `    Hosts: ${context.hostNames.join(', ')} | Rules: ${
        context.ruleNames.length
      } | Tactics: ${context.tactics.join(', ')}`
    );
    console.log(
      `    Process events: ${context.processTree.length} | Network: ${context.networkActivity.length}`
    );

    // Classify
    const classStart = Date.now();
    let classification: CaseClassification;
    let classTokens = { input: 0, output: 0 };

    if (dryRun) {
      classification = {
        classification: 'unknown',
        confidenceScore: 50,
        summary: '[DRY RUN]',
        attackChain: '',
        iocs: [],
        mitreTactics: [],
        remediationSteps: [],
        analystNotes: '',
      };
    } else {
      console.log(`    Classifying via LLM...`);
      const llmResult = await classifyCase(kibana, connectorId, caseInfo, context);
      classification = llmResult.classification;
      classTokens = llmResult.tokens;
      classLlmCalls++;
    }
    const classDurationMs = Date.now() - classStart;

    totalClassInputTokens += classTokens.input;
    totalClassOutputTokens += classTokens.output;

    console.log(
      `    → ${classification.classification.toUpperCase()} (score: ${
        classification.confidenceScore
      })`
    );
    console.log(`    → ${classification.summary.slice(0, 120)}`);
    if (classTokens.input > 0) {
      console.log(`    → Tokens: ${classTokens.input} in / ${classTokens.output} out`);
    }

    // Add classification comment to case
    if (!dryRun) {
      await kibana.post(`/api/cases/${caseInfo.id}/comments`, {
        type: 'user',
        comment: [
          `**Hybrid Triage: ${classification.classification.toUpperCase()}** (confidence: ${
            classification.confidenceScore
          }/100)`,
          '',
          classification.summary,
          classification.analystNotes ? `\n**Notes:** ${classification.analystNotes}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        owner: 'securitySolution',
      });
    }

    caseResults.push({
      caseId: caseInfo.id,
      caseTitle: caseInfo.title,
      alertCount: caseInfo.alertCount,
      hosts: caseInfo.hostNames,
      classification,
      classificationDurationMs: classDurationMs,
      classificationTokens: classTokens,
      adTriggered: false,
      adDurationMs: 0,
      adDiscoveries: 0,
      adAlertsKept: 0,
      adAlertsRejected: 0,
      adTitle: '',
    });
  }

  const classificationDurationMs = Date.now() - classificationStart;

  // ── Stage 3: Selective Attack Discovery ──
  console.log(`\n── Stage 3: Selective Attack Discovery ──`);
  const adStart = Date.now();
  let adLlmCalls = 0;
  let casesWithAd = 0;
  let casesSkipped = 0;

  for (const result of caseResults) {
    const isBenign =
      result.classification.classification === 'benign' &&
      result.classification.confidenceScore >= adThreshold;

    if (isBenign) {
      console.log(
        `\n  [${result.caseTitle}] SKIPPED — benign (${result.classification.confidenceScore})`
      );
      casesSkipped++;
      continue;
    }

    console.log(
      `\n  [${result.caseTitle}] → Running AD (${result.classification.classification}, score ${result.classification.confidenceScore})`
    );

    if (dryRun) {
      console.log(`    [DRY RUN] Would trigger AD`);
      continue;
    }

    const adResult = await triggerAttackDiscovery(kibana, result.caseId, connectorId);
    result.adTriggered = true;
    result.adDurationMs = adResult.durationMs;
    result.adDiscoveries = adResult.discoveries;
    result.adAlertsKept = adResult.alertsKept;
    result.adAlertsRejected = adResult.alertsRejected;
    result.adTitle = adResult.title;
    adLlmCalls++;
    casesWithAd++;

    console.log(`    Duration: ${(adResult.durationMs / 1000).toFixed(1)}s`);
    console.log(`    Discoveries: ${adResult.discoveries}`);
    if (adResult.discoveries > 0) {
      console.log(`    Title: ${adResult.title.slice(0, 80)}`);
      console.log(`    Alerts kept: ${adResult.alertsKept} | Rejected: ${adResult.alertsRejected}`);
    }
  }

  const adDurationMs = Date.now() - adStart;
  const totalDurationMs = Date.now() - totalStart;

  // ── Summary ──
  const classifications = {
    benign: caseResults.filter((r) => r.classification.classification === 'benign').length,
    unknown: caseResults.filter((r) => r.classification.classification === 'unknown').length,
    malicious: caseResults.filter((r) => r.classification.classification === 'malicious').length,
  };

  // Calculate total AD tokens (estimated — AD doesn't return token counts directly)
  const totalAdInputTokensEst = caseResults
    .filter((r) => r.adTriggered)
    .reduce((sum, r) => sum + r.alertCount * 300, 0); // ~300 tokens per alert in prompt
  const totalAdOutputTokensEst = caseResults
    .filter((r) => r.adTriggered && r.adDiscoveries > 0)
    .reduce((sum) => sum + 2000, 0); // ~2000 tokens per AD output

  console.log(`\n── Hybrid Triage Summary ──`);
  console.log(`  Total duration:       ${(totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`  ── Stage 1 (Grouping):       ${(groupingResult.durationMs / 1000).toFixed(1)}s`);
  console.log(
    `  ── Stage 2 (Classification): ${(classificationDurationMs / 1000).toFixed(
      1
    )}s (${classLlmCalls} LLM calls)`
  );
  console.log(
    `  ── Stage 3 (AD):             ${(adDurationMs / 1000).toFixed(1)}s (${adLlmCalls} AD runs)`
  );
  console.log(`  Cases:                ${caseResults.length}`);
  console.log(
    `  Classifications:      benign=${classifications.benign} unknown=${classifications.unknown} malicious=${classifications.malicious}`
  );
  console.log(`  AD triggered:         ${casesWithAd} cases`);
  console.log(`  AD skipped (benign):  ${casesSkipped} cases`);
  console.log(
    `  Classification tokens: ${totalClassInputTokens} in / ${totalClassOutputTokens} out`
  );
  console.log(
    `  Total LLM calls:      ${
      classLlmCalls + adLlmCalls
    } (${classLlmCalls} classification + ${adLlmCalls} AD)`
  );

  const report: HybridReport = {
    startedAt,
    completedAt: new Date().toISOString(),
    stages: {
      grouping: groupingResult,
      classification: {
        durationMs: classificationDurationMs,
        llmCalls: classLlmCalls,
        inputTokens: totalClassInputTokens,
        outputTokens: totalClassOutputTokens,
      },
      attackDiscovery: {
        durationMs: adDurationMs,
        llmCalls: adLlmCalls,
        casesWithAd,
        casesSkipped,
      },
    },
    totalDurationMs,
    totalTokens: {
      input: totalClassInputTokens + totalAdInputTokensEst,
      output: totalClassOutputTokens + totalAdOutputTokensEst,
    },
    totalLlmCalls: classLlmCalls + adLlmCalls,
    cases: caseResults,
    classifications,
  };

  if (outputFile) {
    writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n  Results written to ${outputFile}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
