/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Collect comparison metrics from both triage approaches.
 *
 * Extracts cases, alert assignments, Attack Discovery results, and token usage
 * from a cluster, then outputs a structured JSON report for comparison.
 *
 * Usage:
 *   npx tsx collect_metrics.ts --es-url http://localhost:9200 --kibana-url http://localhost:5601 \
 *     -u elastic -p changeme --label "alert-grouping"
 *
 *   npx tsx collect_metrics.ts --es-url http://localhost:9200 --kibana-url http://localhost:5601 \
 *     -u elastic -p changeme --label "triage-prompt" --output /tmp/triage_metrics.json
 */

import { writeFileSync } from 'fs';
import { ESClient, KibanaClient, parseConnectionArgs, checkCluster } from './es_client';

interface CaseMetrics {
  id: string;
  title: string;
  description: string;
  alertCount: number;
  alertIds: string[];
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  hasAttackDiscovery: boolean;
}

interface AttackDiscoveryMetrics {
  id: string;
  title: string;
  alertsContextCount: number;
  mitreTactics: string[];
  timestamp: string;
}

interface TokenUsageMetrics {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  callCount: number;
}

interface ComparisonReport {
  label: string;
  collectedAt: string;
  cluster: string;
  cases: {
    total: number;
    items: CaseMetrics[];
    totalAlertsAssigned: number;
    avgAlertsPerCase: number;
  };
  attackDiscoveries: {
    total: number;
    items: AttackDiscoveryMetrics[];
  };
  tokenUsage: TokenUsageMetrics;
  alerts: {
    total: number;
    open: number;
    acknowledged: number;
    withCases: number;
    withLlmTriagedTag: number;
  };
}

async function collectCases(kibana: KibanaClient): Promise<CaseMetrics[]> {
  const { status, body } = await kibana.get(
    '/api/cases/_find?perPage=100&sortField=createdAt&sortOrder=asc'
  );

  if (status !== 200 || typeof body !== 'object' || body === null) {
    console.error(`  Failed to fetch cases: ${status}`);
    return [];
  }

  const data = body as Record<string, unknown>;
  const cases = (data.cases ?? []) as Array<Record<string, unknown>>;

  return cases.map((c) => ({
    id: c.id as string,
    title: c.title as string,
    description: ((c.description as string) ?? '').slice(0, 200),
    alertCount: (c.totalAlerts as number) ?? 0,
    alertIds: [],
    status: c.status as string,
    tags: (c.tags ?? []) as string[],
    createdAt: c.created_at as string,
    updatedAt: c.updated_at as string,
    commentCount: (c.totalComment as number) ?? 0,
    hasAttackDiscovery: false, // Filled in below
  }));
}

async function collectCaseAlerts(kibana: KibanaClient, caseId: string): Promise<string[]> {
  const { status, body } = await kibana.get(`/api/cases/${caseId}/comments?perPage=100`);

  if (status !== 200 || typeof body !== 'object' || body === null) {
    return [];
  }

  const data = body as Record<string, unknown>;
  const comments = (data.comments ?? []) as Array<Record<string, unknown>>;

  const alertIds: string[] = [];
  for (const comment of comments) {
    if (comment.type === 'alert') {
      const ids = comment.alertId;
      if (typeof ids === 'string') {
        alertIds.push(ids);
      } else if (Array.isArray(ids)) {
        alertIds.push(...(ids as string[]));
      }
    }
  }

  return alertIds;
}

async function collectAttackDiscoveries(es: ESClient): Promise<AttackDiscoveryMetrics[]> {
  const { status, body } = await es.post(
    '/.adhoc.alerts-security.attack.discovery.alerts-*/_search',
    {
      size: 100,
      sort: [{ '@timestamp': 'desc' }],
      _source: [
        'kibana.alert.attack_discovery.alert_title',
        'kibana.alert.attack_discovery.alerts_context_count',
        'kibana.alert.attack_discovery.mitre_attack_tactics',
        '@timestamp',
      ],
    }
  );

  if (status !== 200 || typeof body !== 'object' || body === null) {
    return [];
  }

  const hits =
    (((body as Record<string, unknown>).hits as Record<string, unknown>)?.hits as Array<
      Record<string, unknown>
    >) ?? [];

  return hits.map((hit) => {
    const src = hit._source as Record<string, unknown>;
    const ad = (src['kibana.alert.attack_discovery'] ?? {}) as Record<string, unknown>;
    return {
      id: hit._id as string,
      title: (ad.alert_title as string) ?? '',
      alertsContextCount: (ad.alerts_context_count as number) ?? 0,
      mitreTactics: (ad.mitre_attack_tactics ?? []) as string[],
      timestamp: (src['@timestamp'] as string) ?? '',
    };
  });
}

async function collectTokenUsage(es: ESClient): Promise<TokenUsageMetrics> {
  // Look for gen_ai token usage documents logged by the LLM connector
  const { status, body } = await es.post('/logs-*/_search', {
    size: 0,
    query: {
      bool: {
        must: [
          { term: { 'event.action': 'gen_ai_token_count' } },
          { range: { '@timestamp': { gte: 'now-24h' } } },
        ],
      },
    },
    aggs: {
      total_input: { sum: { field: 'gen_ai.usage.prompt_tokens' } },
      total_output: { sum: { field: 'gen_ai.usage.completion_tokens' } },
      total_tokens: { sum: { field: 'gen_ai.usage.total_tokens' } },
      call_count: { value_count: { field: 'gen_ai.usage.total_tokens' } },
    },
  });

  if (status !== 200 || typeof body !== 'object' || body === null) {
    return { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, callCount: 0 };
  }

  const aggs = (body as Record<string, unknown>).aggregations as
    | Record<string, unknown>
    | undefined;
  if (!aggs) {
    return { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, callCount: 0 };
  }

  return {
    totalInputTokens: ((aggs.total_input as Record<string, unknown>)?.value as number) ?? 0,
    totalOutputTokens: ((aggs.total_output as Record<string, unknown>)?.value as number) ?? 0,
    totalTokens: ((aggs.total_tokens as Record<string, unknown>)?.value as number) ?? 0,
    callCount: ((aggs.call_count as Record<string, unknown>)?.value as number) ?? 0,
  };
}

async function collectAlertStats(es: ESClient): Promise<ComparisonReport['alerts']> {
  const { status, body } = await es.post('/.alerts-security.alerts-*/_search', {
    size: 0,
    query: { match_all: {} },
    aggs: {
      total: { value_count: { field: 'kibana.alert.uuid' } },
      by_status: { terms: { field: 'kibana.alert.workflow_status', size: 10 } },
      with_cases: {
        filter: { exists: { field: 'kibana.alert.case_ids' } },
        aggs: {
          non_empty: {
            filter: {
              script: {
                script: "doc['kibana.alert.case_ids'].size() > 0",
              },
            },
          },
        },
      },
      with_llm_tag: {
        filter: { term: { 'kibana.alert.workflow_tags': 'llm-triaged' } },
      },
    },
  });

  if (status !== 200 || typeof body !== 'object' || body === null) {
    return { total: 0, open: 0, acknowledged: 0, withCases: 0, withLlmTriagedTag: 0 };
  }

  const aggs = (body as Record<string, unknown>).aggregations as
    | Record<string, unknown>
    | undefined;
  if (!aggs) {
    return { total: 0, open: 0, acknowledged: 0, withCases: 0, withLlmTriagedTag: 0 };
  }

  const statusBuckets = ((aggs.by_status as Record<string, unknown>)?.buckets ?? []) as Array<{
    key: string;
    doc_count: number;
  }>;
  const openCount = statusBuckets.find((b) => b.key === 'open')?.doc_count ?? 0;
  const ackCount = statusBuckets.find((b) => b.key === 'acknowledged')?.doc_count ?? 0;

  return {
    total: ((aggs.total as Record<string, unknown>)?.value as number) ?? 0,
    open: openCount,
    acknowledged: ackCount,
    withCases:
      (((aggs.with_cases as Record<string, unknown>)?.non_empty as Record<string, unknown>)
        ?.doc_count as number) ?? 0,
    withLlmTriagedTag: ((aggs.with_llm_tag as Record<string, unknown>)?.doc_count as number) ?? 0,
  };
}

async function main(): Promise<void> {
  const args = parseConnectionArgs(process.argv);
  const label = args.extra.label ?? 'unknown';
  const outputFile = args.extra.output;

  if (!args.esUrl) {
    console.error('ERROR: --es-url is required');
    process.exit(1);
  }
  if (!args.kibanaUrl) {
    // Default to same host, port 5601
    args.kibanaUrl = args.esUrl.replace(/:\d+/, ':5601');
    console.log(`  Kibana URL not provided, defaulting to: ${args.kibanaUrl}`);
  }

  const es = new ESClient({
    baseUrl: args.esUrl,
    apiKey: args.apiKey,
    user: args.user,
    password: args.password,
  });

  const kibana = new KibanaClient({
    baseUrl: args.kibanaUrl,
    apiKey: args.apiKey,
    user: args.user,
    password: args.password,
  });

  console.log(`\n── Collecting metrics (label: "${label}") ──\n`);

  console.log(`Checking cluster...`);
  await checkCluster(es);

  // Collect all data
  console.log(`\nCollecting cases...`);
  const cases = await collectCases(kibana);
  console.log(`  Found ${cases.length} cases`);

  // For cases with alerts, get alert IDs via comments endpoint
  for (const c of cases) {
    if (c.alertCount > 0) {
      const alertIds = await collectCaseAlerts(kibana, c.id);
      c.alertIds = alertIds;
      // Use the totalAlerts from the case API if comments endpoint returns fewer
      if (alertIds.length > 0) {
        c.alertCount = Math.max(c.alertCount, alertIds.length);
      }
    }
  }

  console.log(`Collecting attack discoveries...`);
  const ads = await collectAttackDiscoveries(es);
  console.log(`  Found ${ads.length} attack discoveries`);

  // Mark cases that have AD
  for (const c of cases) {
    c.hasAttackDiscovery = ads.some((ad) =>
      c.alertIds.some((alertId) => ad.title.includes(alertId))
    );
  }

  console.log(`Collecting token usage...`);
  const tokenUsage = await collectTokenUsage(es);
  console.log(`  Total tokens: ${tokenUsage.totalTokens} (${tokenUsage.callCount} calls)`);

  console.log(`Collecting alert stats...`);
  const alertStats = await collectAlertStats(es);
  console.log(`  Total alerts: ${alertStats.total}`);

  // Build report
  const totalAlertsAssigned = cases.reduce((sum, c) => sum + c.alertCount, 0);
  const report: ComparisonReport = {
    label,
    collectedAt: new Date().toISOString(),
    cluster: args.esUrl,
    cases: {
      total: cases.length,
      items: cases,
      totalAlertsAssigned,
      avgAlertsPerCase: cases.length > 0 ? Math.round(totalAlertsAssigned / cases.length) : 0,
    },
    attackDiscoveries: {
      total: ads.length,
      items: ads,
    },
    tokenUsage,
    alerts: alertStats,
  };

  // Output
  const reportJson = JSON.stringify(report, null, 2);

  if (outputFile) {
    writeFileSync(outputFile, reportJson);
    console.log(`\n── Report written to ${outputFile} ──`);
  } else {
    console.log(`\n── Report ──\n`);
    console.log(reportJson);
  }

  // Print summary table
  console.log(`\n── Summary ──`);
  console.log(`  Label:                ${label}`);
  console.log(`  Cases:                ${cases.length}`);
  console.log(`  Alerts assigned:      ${totalAlertsAssigned}`);
  console.log(`  Avg alerts/case:      ${report.cases.avgAlertsPerCase}`);
  console.log(`  Attack Discoveries:   ${ads.length}`);
  console.log(`  LLM calls:           ${tokenUsage.callCount}`);
  console.log(`  Total tokens:         ${tokenUsage.totalTokens.toLocaleString()}`);
  console.log(`    Input tokens:       ${tokenUsage.totalInputTokens.toLocaleString()}`);
  console.log(`    Output tokens:      ${tokenUsage.totalOutputTokens.toLocaleString()}`);
  console.log(`  Alerts (open):        ${alertStats.open}`);
  console.log(`  Alerts (acknowledged):${alertStats.acknowledged}`);
  console.log(`  Alerts with cases:    ${alertStats.withCases}`);
  console.log(`  Alerts llm-triaged:   ${alertStats.withLlmTriagedTag}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
