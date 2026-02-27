/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript implementation of the triage prompt workflow.
 *
 * Processes alerts sequentially, one at a time:
 *   1. Fetch next unacknowledged alert (oldest first)
 *   2. Check if alert should join an existing case
 *   3. Gather context (ES|QL queries for process tree, network, files)
 *   4. Call LLM to classify (benign / unknown / malicious) and generate summary
 *   5. Create or update a Kibana case with findings
 *   6. Acknowledge the alert (+ related alerts on same agent within time window)
 *   7. Repeat
 *
 * Usage:
 *   npx tsx triage_runner.ts \
 *     --es-url http://localhost:9200 \
 *     --kibana-url http://localhost:5601 \
 *     -u elastic -p changeme \
 *     --connector-id <kibana-action-connector-id>
 *
 *   # Process only 5 alerts then stop
 *   npx tsx triage_runner.ts ... --max-alerts 5
 *
 *   # Dry run — fetch and classify but don't create cases or acknowledge
 *   npx tsx triage_runner.ts ... --dry-run
 */

import { writeFileSync } from 'fs';
import { ESClient, parseConnectionArgs, checkCluster } from './es_client';
import { KibanaClient } from './kibana_client';

// ── Types ──

interface Alert {
  id: string;
  index: string;
  timestamp: string;
  ruleName: string;
  severity: string;
  hostName: string;
  agentId: string;
  userName: string;
  processName: string;
  commandLine: string;
  parentProcess: string;
  tactics: string[];
  techniques: string[];
  reason: string;
  riskScore: number;
  rawSource: Record<string, unknown>;
}

interface TriageContext {
  relatedAlerts: Array<{ id: string; ruleName: string; timestamp: string; severity: string }>;
  ruleFrequency: number;
  processTree: Array<{
    timestamp: string;
    processName: string;
    pid: number;
    parentName: string;
    commandLine: string;
    user: string;
  }>;
  networkActivity: Array<{
    timestamp: string;
    processName: string;
    destIp: string;
    destPort: number;
    direction: string;
  }>;
  fileActivity: Array<{ timestamp: string; processName: string; filePath: string; action: string }>;
}

interface Classification {
  classification: 'benign' | 'unknown' | 'malicious';
  confidenceScore: number;
  summary: string;
  attackChain: string;
  iocs: string[];
  mitreTactics: string[];
  remediationSteps: string[];
  analystNotes: string;
}

interface TriageResult {
  alert: Alert;
  context: TriageContext;
  classification: Classification;
  caseId: string | null;
  relatedAlertIds: string[];
  durationMs: number;
  llmTokens: { input: number; output: number };
}

// ── Alert Fetching ──

async function fetchNextAlert(es: ESClient, filterTag?: string): Promise<Alert | null> {
  const must: Array<Record<string, unknown>> = [
    { term: { 'kibana.alert.workflow_status': 'open' } },
  ];
  if (filterTag) {
    must.push({ term: { tags: filterTag } });
  }

  const { status, body } = await es.post('/.alerts-security.alerts-*/_search', {
    size: 1,
    query: {
      bool: {
        must,
        must_not: [{ term: { 'kibana.alert.workflow_tags': 'llm-triaged' } }],
      },
    },
    sort: [{ '@timestamp': 'asc' }],
  });

  if (status !== 200 || typeof body !== 'object' || body === null) return null;

  const hits =
    (((body as Record<string, unknown>).hits as Record<string, unknown>)?.hits as Array<
      Record<string, unknown>
    >) ?? [];

  if (hits.length === 0) return null;

  const hit = hits[0];
  const src = hit._source as Record<string, unknown>;
  const host = (src.host ?? {}) as Record<string, unknown>;
  const proc = (src.process ?? {}) as Record<string, unknown>;
  const parent = (proc.parent ?? {}) as Record<string, unknown>;
  const agent = (src.agent ?? {}) as Record<string, unknown>;
  const user = (src.user ?? {}) as Record<string, unknown>;
  const threat = (src['kibana.alert.rule.threat'] ?? []) as Array<Record<string, unknown>>;

  return {
    id: hit._id as string,
    index: hit._index as string,
    timestamp: (src['@timestamp'] as string) ?? '',
    ruleName: (src['kibana.alert.rule.name'] as string) ?? '',
    severity: (src['kibana.alert.severity'] as string) ?? '',
    hostName: (host.name as string) ?? '',
    agentId: (agent.id as string) ?? '',
    userName: (user.name as string) ?? '',
    processName: (proc.name as string) ?? '',
    commandLine: (proc.command_line as string) ?? '',
    parentProcess: (parent.name as string) ?? '',
    tactics: threat
      .map((t) => ((t.tactic as Record<string, unknown>)?.name as string) ?? '')
      .filter(Boolean),
    techniques: threat.flatMap((t) => {
      const techs = (t.technique ?? []) as Array<Record<string, unknown>>;
      return techs.map((tech) => (tech.id as string) ?? '').filter(Boolean);
    }),
    reason: (src['kibana.alert.reason'] as string) ?? '',
    riskScore: (src['kibana.alert.risk_score'] as number) ?? 0,
    rawSource: src,
  };
}

// ── Context Gathering ──

async function gatherContext(es: ESClient, alert: Alert): Promise<TriageContext> {
  const alertTime = new Date(alert.timestamp);
  const windowStart = new Date(alertTime.getTime() - 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(alertTime.getTime() + 60 * 60 * 1000).toISOString();

  // Run all context queries in parallel
  const [relatedResp, freqResp, processResp, networkResp, fileResp] = await Promise.all([
    // 1. Related alerts on same agent
    es.post('/.alerts-security.alerts-*/_search', {
      size: 50,
      query: {
        bool: {
          must: [
            { term: { 'agent.id': alert.agentId } },
            { range: { '@timestamp': { gte: windowStart, lte: windowEnd } } },
          ],
          must_not: [{ term: { _id: alert.id } }],
        },
      },
      _source: ['kibana.alert.rule.name', '@timestamp', 'kibana.alert.severity'],
      sort: [{ '@timestamp': 'asc' }],
    }),

    // 2. Rule frequency across environment
    es.post('/.alerts-security.alerts-*/_search', {
      size: 0,
      query: { term: { 'kibana.alert.rule.name': alert.ruleName } },
      aggs: { count: { value_count: { field: 'kibana.alert.uuid' } } },
    }),

    // 3. Process tree
    es.post('/logs-endpoint.events.process-*/_search', {
      size: 30,
      query: {
        bool: {
          must: [
            { term: { 'agent.id': alert.agentId } },
            { range: { '@timestamp': { gte: windowStart, lte: windowEnd } } },
          ],
        },
      },
      _source: [
        '@timestamp',
        'process.name',
        'process.pid',
        'process.parent.name',
        'process.command_line',
        'user.name',
      ],
      sort: [{ '@timestamp': 'asc' }],
    }),

    // 4. Network activity
    es.post('/logs-endpoint.events.network-*/_search', {
      size: 30,
      query: {
        bool: {
          must: [
            { term: { 'agent.id': alert.agentId } },
            { range: { '@timestamp': { gte: windowStart, lte: windowEnd } } },
          ],
        },
      },
      _source: [
        '@timestamp',
        'process.name',
        'destination.ip',
        'destination.port',
        'network.direction',
      ],
      sort: [{ '@timestamp': 'asc' }],
    }),

    // 5. File activity
    es.post('/logs-endpoint.events.file-*/_search', {
      size: 20,
      query: {
        bool: {
          must: [
            { term: { 'agent.id': alert.agentId } },
            { range: { '@timestamp': { gte: windowStart, lte: windowEnd } } },
          ],
        },
      },
      _source: ['@timestamp', 'process.name', 'file.path', 'event.action'],
      sort: [{ '@timestamp': 'asc' }],
    }),
  ]);

  const extractHits = (resp: { status: number; body: unknown }) => {
    if (resp.status !== 200 || typeof resp.body !== 'object' || resp.body === null) return [];
    return (((resp.body as Record<string, unknown>).hits as Record<string, unknown>)?.hits ??
      []) as Array<Record<string, unknown>>;
  };

  const relatedHits = extractHits(relatedResp);
  const processHits = extractHits(processResp);
  const networkHits = extractHits(networkResp);
  const fileHits = extractHits(fileResp);

  const freqAggs =
    typeof freqResp.body === 'object' && freqResp.body !== null
      ? ((freqResp.body as Record<string, unknown>).aggregations as
          | Record<string, unknown>
          | undefined)
      : undefined;
  const ruleFrequency = ((freqAggs?.count as Record<string, unknown>)?.value as number) ?? 0;

  return {
    relatedAlerts: relatedHits.map((h) => {
      const s = h._source as Record<string, unknown>;
      return {
        id: h._id as string,
        ruleName: (s['kibana.alert.rule.name'] as string) ?? '',
        timestamp: (s['@timestamp'] as string) ?? '',
        severity: (s['kibana.alert.severity'] as string) ?? '',
      };
    }),
    ruleFrequency,
    processTree: processHits.map((h) => {
      const s = h._source as Record<string, unknown>;
      const p = (s.process ?? {}) as Record<string, unknown>;
      const par = (p.parent ?? {}) as Record<string, unknown>;
      return {
        timestamp: (s['@timestamp'] as string) ?? '',
        processName: (p.name as string) ?? '',
        pid: (p.pid as number) ?? 0,
        parentName: (par.name as string) ?? '',
        commandLine: (p.command_line as string) ?? '',
        user: ((s.user as Record<string, unknown>)?.name as string) ?? '',
      };
    }),
    networkActivity: networkHits.map((h) => {
      const s = h._source as Record<string, unknown>;
      const p = (s.process ?? {}) as Record<string, unknown>;
      const dest = (s.destination ?? {}) as Record<string, unknown>;
      const net = (s.network ?? {}) as Record<string, unknown>;
      return {
        timestamp: (s['@timestamp'] as string) ?? '',
        processName: (p.name as string) ?? '',
        destIp: (dest.ip as string) ?? '',
        destPort: (dest.port as number) ?? 0,
        direction: (net.direction as string) ?? '',
      };
    }),
    fileActivity: fileHits.map((h) => {
      const s = h._source as Record<string, unknown>;
      const p = (s.process ?? {}) as Record<string, unknown>;
      const f = (s.file ?? {}) as Record<string, unknown>;
      const ev = (s.event ?? {}) as Record<string, unknown>;
      return {
        timestamp: (s['@timestamp'] as string) ?? '',
        processName: (p.name as string) ?? '',
        filePath: (f.path as string) ?? '',
        action: (ev.action as string) ?? '',
      };
    }),
  };
}

// ── LLM Classification ──

function buildClassificationPrompt(alert: Alert, context: TriageContext): string {
  const relatedSection =
    context.relatedAlerts.length > 0
      ? `Related alerts on same agent (${context.relatedAlerts.length}):\n${context.relatedAlerts
          .map((a) => `  - ${a.timestamp}: ${a.ruleName} (${a.severity})`)
          .join('\n')}`
      : 'No related alerts found on same agent.';

  const processSection =
    context.processTree.length > 0
      ? `Process tree (${context.processTree.length} events):\n${context.processTree
          .slice(0, 15)
          .map(
            (p) =>
              `  - ${p.timestamp}: ${p.parentName} → ${p.processName} (pid ${
                p.pid
              }): ${p.commandLine.slice(0, 120)}`
          )
          .join('\n')}`
      : 'No process tree data available.';

  const networkSection =
    context.networkActivity.length > 0
      ? `Network activity (${context.networkActivity.length} events):\n${context.networkActivity
          .slice(0, 10)
          .map(
            (n) =>
              `  - ${n.timestamp}: ${n.processName} → ${n.destIp}:${n.destPort} (${n.direction})`
          )
          .join('\n')}`
      : 'No network activity data available.';

  const fileSection =
    context.fileActivity.length > 0
      ? `File activity (${context.fileActivity.length} events):\n${context.fileActivity
          .slice(0, 10)
          .map((f) => `  - ${f.timestamp}: ${f.processName}: ${f.action} ${f.filePath}`)
          .join('\n')}`
      : 'No file activity data available.';

  return `You are an Elastic Security alert triage analyst. Analyze this alert and all gathered context, then provide a classification.

IMPORTANT: Most alerts are FALSE POSITIVES. Require STRONG CORROBORATING EVIDENCE for "malicious" classification.
- Single suspicious indicators alone = "unknown", not "malicious"
- To classify as malicious, you need at least ONE of: confirmed C2, persistence established, credential theft, lateral movement, defense evasion
- "unknown" is the correct classification when evidence is insufficient

## Alert Details
- Rule: ${alert.ruleName}
- Severity: ${alert.severity} (this is the rule author's opinion, not evidence)
- Risk Score: ${alert.riskScore}
- Timestamp: ${alert.timestamp}
- Host: ${alert.hostName}
- Agent ID: ${alert.agentId}
- User: ${alert.userName}
- Process: ${alert.processName} (parent: ${alert.parentProcess})
- Command: ${alert.commandLine.slice(0, 300)}
- MITRE Tactics: ${alert.tactics.join(', ') || 'none'}
- MITRE Techniques: ${alert.techniques.join(', ') || 'none'}
- Reason: ${alert.reason.slice(0, 300)}
- Rule frequency in environment: ${context.ruleFrequency} total alerts from this rule

## Context Gathered

${relatedSection}

${processSection}

${networkSection}

${fileSection}

## Required Output (JSON)
Respond with ONLY a JSON object (no markdown, no explanation outside JSON):
{
  "classification": "benign" | "unknown" | "malicious",
  "confidenceScore": <0-100>,
  "summary": "<2-3 sentence summary of findings>",
  "attackChain": "<description of attack sequence if malicious, empty string if not>",
  "iocs": ["<list of IOCs: IPs, hashes, file paths, domains>"],
  "mitreTactics": ["<relevant MITRE tactics>"],
  "remediationSteps": ["<recommended actions>"],
  "analystNotes": "<additional observations and reasoning>"
}`;
}

async function classifyAlert(
  kibana: KibanaClient,
  connectorId: string,
  alert: Alert,
  context: TriageContext
): Promise<{ classification: Classification; tokens: { input: number; output: number } }> {
  const prompt = buildClassificationPrompt(alert, context);

  const { status, body } = await kibana.post(`/api/actions/connector/${connectorId}/_execute`, {
    params: {
      subAction: 'invokeAI',
      subActionParams: {
        messages: [
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
      },
    },
  });

  if (status !== 200 || typeof body !== 'object' || body === null) {
    console.error(`  LLM call failed (${status}): ${JSON.stringify(body).slice(0, 200)}`);
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

  // Extract token usage
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

  // Parse the JSON response
  try {
    // Extract JSON from potential markdown wrapping
    const jsonMatch = message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Classification;
      return { classification: parsed, tokens };
    }
  } catch {
    // Fall through
  }

  return {
    classification: {
      classification: 'unknown',
      confidenceScore: 0,
      summary: `LLM response could not be parsed: ${message.slice(0, 100)}`,
      attackChain: '',
      iocs: [],
      mitreTactics: [],
      remediationSteps: [],
      analystNotes: 'Failed to parse LLM response as JSON',
    },
    tokens,
  };
}

// ── Case Management ──

async function findExistingCase(
  kibana: KibanaClient,
  alert: Alert
): Promise<{ id: string; title: string } | null> {
  // Search for cases with matching host or agent tags
  const { status, body } = await kibana.get(
    `/api/cases/_find?perPage=20&sortField=createdAt&sortOrder=desc&tags=${encodeURIComponent(
      `agent:${alert.agentId}`
    )}`
  );

  if (status !== 200 || typeof body !== 'object' || body === null) return null;

  const cases = ((body as Record<string, unknown>).cases ?? []) as Array<Record<string, unknown>>;
  if (cases.length === 0) return null;

  // Return the most recent matching case
  return {
    id: cases[0].id as string,
    title: cases[0].title as string,
  };
}

async function createCase(
  kibana: KibanaClient,
  alert: Alert,
  classification: Classification
): Promise<string | null> {
  const { status, body } = await kibana.post('/api/cases', {
    title: `[Triage] ${alert.ruleName} on ${alert.hostName}`,
    description: classification.summary,
    tags: [
      `agent:${alert.agentId}`,
      `host:${alert.hostName}`,
      `classification:${classification.classification}`,
      `confidence:${classification.confidenceScore}`,
      'triage-prompt',
    ],
    connector: { id: 'none', name: 'none', type: '.none', fields: null },
    settings: { syncAlerts: true },
    owner: 'securitySolution',
    severity:
      alert.severity === 'critical'
        ? 'critical'
        : alert.severity === 'high'
        ? 'high'
        : alert.severity === 'medium'
        ? 'medium'
        : 'low',
  });

  if (status !== 200 || typeof body !== 'object' || body === null) {
    console.error(`  Failed to create case: ${status}`);
    return null;
  }

  return (body as Record<string, unknown>).id as string;
}

async function attachAlertToCase(
  kibana: KibanaClient,
  caseId: string,
  alert: Alert
): Promise<void> {
  await kibana.post(`/api/cases/${caseId}/comments`, {
    type: 'alert',
    alertId: alert.id,
    index: alert.index,
    rule: { id: null, name: alert.ruleName },
    owner: 'securitySolution',
  });
}

async function addCaseComment(
  kibana: KibanaClient,
  caseId: string,
  comment: string
): Promise<void> {
  await kibana.post(`/api/cases/${caseId}/comments`, {
    type: 'user',
    comment,
    owner: 'securitySolution',
  });
}

// ── Alert Acknowledgment ──

async function acknowledgeAlerts(es: ESClient, alertIds: string[]): Promise<number> {
  if (alertIds.length === 0) return 0;

  const { status, body } = await es.post(
    '/.alerts-security.alerts-*/_update_by_query?refresh=true',
    {
      query: { terms: { _id: alertIds } },
      script: {
        source: `
          ctx._source['kibana.alert.workflow_status'] = 'acknowledged';
          if (ctx._source.containsKey('kibana.alert.workflow_tags')) {
            if (!ctx._source['kibana.alert.workflow_tags'].contains('llm-triaged')) {
              ctx._source['kibana.alert.workflow_tags'].add('llm-triaged');
            }
          } else {
            ctx._source['kibana.alert.workflow_tags'] = ['llm-triaged'];
          }
        `,
        lang: 'painless',
      },
    }
  );

  if (status !== 200 || typeof body !== 'object' || body === null) return 0;
  return ((body as Record<string, unknown>).updated as number) ?? 0;
}

// ── Main Loop ──

async function main(): Promise<void> {
  const args = parseConnectionArgs(process.argv);
  const dryRun = args.dryRun;
  const maxAlerts = parseInt(args.extra['max-alerts'] ?? '0', 10);
  const connectorId = args.extra['connector-id'] ?? '';
  const outputFile = args.extra.output;
  const spaceId = args.extra.space ?? '';
  const filterTag = args.extra['filter-tag'] ?? '';

  if (!args.esUrl) {
    console.error('ERROR: --es-url is required');
    process.exit(1);
  }
  if (!args.kibanaUrl) {
    args.kibanaUrl = args.esUrl.replace(/:\d+/, ':5601');
  }
  if (!connectorId && !dryRun) {
    console.error('ERROR: --connector-id is required (Kibana action connector for LLM)');
    console.error('  Find available connectors: GET /api/actions/connectors');
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

  console.log(`── Triage Runner ──`);
  console.log(`  ES:         ${args.esUrl}`);
  console.log(`  Kibana:     ${args.kibanaUrl}`);
  console.log(`  Connector:  ${connectorId || '(dry run)'}`);
  console.log(`  Max alerts: ${maxAlerts || 'unlimited'}`);
  console.log(`  Space:      ${spaceId || 'default'}`);
  console.log(`  Filter tag: ${filterTag || '(none)'}`);
  console.log(`  Dry run:    ${dryRun}`);

  console.log(`\n── Connecting ──`);
  const healthy = await checkCluster(es);
  if (!healthy) process.exit(1);

  const results: TriageResult[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let alertsProcessed = 0;

  console.log(`\n── Processing alerts ──\n`);

  while (true) {
    if (maxAlerts > 0 && alertsProcessed >= maxAlerts) {
      console.log(`\n  Reached max alerts limit (${maxAlerts})`);
      break;
    }

    const startTime = Date.now();

    // Step 1: Fetch next alert
    const alert = await fetchNextAlert(es, filterTag || undefined);
    if (!alert) {
      console.log(`\n  No more unacknowledged alerts`);
      break;
    }

    alertsProcessed++;
    console.log(`[${alertsProcessed}] ${alert.ruleName}`);
    console.log(`    Host: ${alert.hostName} | User: ${alert.userName} | ${alert.timestamp}`);
    console.log(
      `    Process: ${alert.parentProcess} → ${alert.processName}: ${alert.commandLine.slice(
        0,
        80
      )}`
    );

    // Step 2: Gather context
    console.log(`    Gathering context...`);
    const context = await gatherContext(es, alert);
    console.log(
      `    Related alerts: ${context.relatedAlerts.length} | Process events: ${context.processTree.length} | Network: ${context.networkActivity.length} | Files: ${context.fileActivity.length} | Rule freq: ${context.ruleFrequency}`
    );

    // Step 3: Classify via LLM
    let classification: Classification;
    let tokens = { input: 0, output: 0 };

    if (dryRun) {
      classification = {
        classification: 'unknown',
        confidenceScore: 50,
        summary: '[DRY RUN] No LLM classification performed',
        attackChain: '',
        iocs: [],
        mitreTactics: alert.tactics,
        remediationSteps: [],
        analystNotes: 'Dry run mode',
      };
    } else {
      console.log(`    Classifying via LLM...`);
      const llmResult = await classifyAlert(kibana, connectorId, alert, context);
      classification = llmResult.classification;
      tokens = llmResult.tokens;
      totalInputTokens += tokens.input;
      totalOutputTokens += tokens.output;
    }

    console.log(
      `    → ${classification.classification.toUpperCase()} (score: ${
        classification.confidenceScore
      })`
    );
    console.log(`    → ${classification.summary.slice(0, 120)}`);
    if (tokens.input > 0) {
      console.log(`    → Tokens: ${tokens.input} in / ${tokens.output} out`);
    }

    // Step 4: Create or update case
    let caseId: string | null = null;
    if (!dryRun) {
      const existingCase = await findExistingCase(kibana, alert);
      if (existingCase) {
        console.log(`    Joining existing case: ${existingCase.title} (${existingCase.id})`);
        caseId = existingCase.id;
      } else {
        caseId = await createCase(kibana, alert, classification);
        if (caseId) {
          console.log(`    Created case: ${caseId}`);
        }
      }

      if (caseId) {
        await attachAlertToCase(kibana, caseId, alert);

        // Add classification comment
        const commentBody = [
          `**Triage Classification: ${classification.classification.toUpperCase()}** (confidence: ${
            classification.confidenceScore
          }/100)`,
          '',
          classification.summary,
          '',
          classification.attackChain ? `**Attack Chain:** ${classification.attackChain}` : '',
          classification.iocs.length > 0 ? `**IOCs:** ${classification.iocs.join(', ')}` : '',
          classification.mitreTactics.length > 0
            ? `**MITRE Tactics:** ${classification.mitreTactics.join(', ')}`
            : '',
          classification.remediationSteps.length > 0
            ? `**Remediation:** ${classification.remediationSteps.join('; ')}`
            : '',
          '',
          `**Context:** ${context.relatedAlerts.length} related alerts, ${context.processTree.length} process events, ${context.networkActivity.length} network events`,
          '',
          classification.analystNotes ? `**Notes:** ${classification.analystNotes}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        await addCaseComment(kibana, caseId, commentBody);
      }
    }

    // Step 5: Acknowledge alert + related
    const allAlertIds = [alert.id, ...context.relatedAlerts.map((a) => a.id)];
    if (!dryRun) {
      const acked = await acknowledgeAlerts(es, allAlertIds);
      console.log(
        `    Acknowledged ${acked} alerts (primary + ${context.relatedAlerts.length} related)`
      );
    }

    const durationMs = Date.now() - startTime;
    console.log(`    Duration: ${(durationMs / 1000).toFixed(1)}s\n`);

    results.push({
      alert,
      context,
      classification,
      caseId,
      relatedAlertIds: context.relatedAlerts.map((a) => a.id),
      durationMs,
      llmTokens: tokens,
    });
  }

  // Summary
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  const classifications = {
    benign: results.filter((r) => r.classification.classification === 'benign').length,
    unknown: results.filter((r) => r.classification.classification === 'unknown').length,
    malicious: results.filter((r) => r.classification.classification === 'malicious').length,
  };

  console.log(`\n── Triage Summary ──`);
  console.log(`  Alerts processed:     ${results.length}`);
  console.log(`  Total duration:       ${(totalDurationMs / 1000).toFixed(1)}s`);
  console.log(
    `  Avg per alert:        ${
      results.length > 0 ? (totalDurationMs / results.length / 1000).toFixed(1) : 0
    }s`
  );
  console.log(
    `  Classifications:      benign=${classifications.benign} unknown=${classifications.unknown} malicious=${classifications.malicious}`
  );
  console.log(`  Total input tokens:   ${totalInputTokens.toLocaleString()}`);
  console.log(`  Total output tokens:  ${totalOutputTokens.toLocaleString()}`);
  console.log(
    `  Cases created/joined: ${new Set(results.map((r) => r.caseId).filter(Boolean)).size}`
  );

  if (outputFile) {
    const report = {
      startedAt: new Date(Date.now() - totalDurationMs).toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationMs,
      alertsProcessed: results.length,
      classifications,
      tokenUsage: {
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
      },
      results: results.map((r) => ({
        alertId: r.alert.id,
        ruleName: r.alert.ruleName,
        host: r.alert.hostName,
        classification: r.classification.classification,
        confidenceScore: r.classification.confidenceScore,
        summary: r.classification.summary,
        caseId: r.caseId,
        relatedAlertCount: r.relatedAlertIds.length,
        durationMs: r.durationMs,
        tokens: r.llmTokens,
      })),
    };
    writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n  Results written to ${outputFile}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
