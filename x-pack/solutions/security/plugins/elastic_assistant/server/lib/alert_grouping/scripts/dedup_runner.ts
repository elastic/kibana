/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hybrid Alert Deduplication Runner
 *
 * Runs the hybrid vector + LLM alert deduplication pipeline against a local
 * Elasticsearch cluster. Fetches security alerts, vectorizes them, and
 * clusters them using the HybridClustering engine.
 *
 * Usage:
 *   npx tsx dedup_runner.ts \
 *     --es-url http://localhost:9200 \
 *     --kibana-url http://localhost:5601 \
 *     -u elastic -p changeme \
 *     --connector-id <connectorId> \
 *     [--rule-name "Potential Reverse Shell Activity"] \
 *     [--distance 0.004] \
 *     [--rank-cutoff 3] \
 *     [--age 24] \
 *     [--max-alerts 5000] \
 *     [--output /tmp/dedup_results.json] \
 *     [--show-groups] \
 *     [--update-alerts] \
 *     [--dry-run]
 *
 * Options:
 *   --es-url          Elasticsearch URL (required)
 *   --kibana-url      Kibana URL (for LLM connector calls, defaults to es-url:5601)
 *   --connector-id    Kibana connector ID for LLM calls (required unless --dry-run)
 *   -u / --user       Username (default: elastic)
 *   -p / --password   Password (default: changeme)
 *   --rule-name       Filter alerts by rule name
 *   --distance        Cosine distance threshold for Stage 1 (default: 0.004)
 *   --rank-cutoff     Use top-N rank cutoff instead of threshold (default: 0, disabled)
 *   --age             Hours of alert history to query (default: 24)
 *   --max-alerts      Maximum alerts to process (default: 5000)
 *   --output          Path to write JSON results
 *   --show-groups     Print all alerts grouped by cluster in the console output
 *   --update-alerts   Write cluster IDs back to alerts in Elasticsearch (kibana.alert.cluster.id)
 *   --dry-run         Skip LLM calls, only run vector-based clustering
 */

import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

import { ESClient, parseConnectionArgs, checkCluster } from './es_client';
import { KibanaClient } from './kibana_client';

import {
  HybridClustering,
  getGenericAlertFeatureVector,
  getVal,
  getRuleName,
  displayAlert,
  groupByDistinctValue,
  RULE_FIELDS,
  UNIQUE_FIELD,
} from '../services/hybrid_alert_deduplication';
import type {
  EnrichedAlert,
  AlertDocument,
  LLMInvokeFn,
} from '../services/hybrid_alert_deduplication';

// ============================================================
// Logger shim (console-based for script use)
// ============================================================

const logger = {
  debug: (msg: string) => {
    if (process.env.DEBUG) console.log(`  [DEBUG] ${msg}`);
  },
  info: (msg: string) => console.log(`  [INFO] ${msg}`),
  warn: (msg: string) => console.warn(`  [WARN] ${msg}`),
  error: (msg: string) => console.error(`  [ERROR] ${msg}`),
  fatal: (msg: string) => console.error(`  [FATAL] ${msg}`),
  trace: (msg: string) => {
    if (process.env.TRACE) console.log(`  [TRACE] ${msg}`);
  },
  log: (msg: string) => console.log(msg),
  get: () => logger,
  isLevelEnabled: () => !!process.env.DEBUG,
} as unknown as import('@kbn/logging').Logger;

// ============================================================
// Fetch alerts from Elasticsearch
// ============================================================

async function fetchAlerts(
  es: ESClient,
  options: {
    ruleName?: string;
    ageHours: number;
    maxAlerts: number;
    indexPattern?: string;
  }
): Promise<AlertDocument[]> {
  const { ruleName, ageHours, maxAlerts, indexPattern } = options;
  const index = indexPattern ?? '.alerts-security.alerts-*';

  const must: unknown[] = [{ range: { '@timestamp': { gte: `now-${ageHours}h` } } }];

  if (ruleName) {
    must.push({
      bool: {
        should: [
          { term: { 'kibana.alert.rule.name': ruleName } },
          { term: { 'rule.name': ruleName } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  console.log(
    `\n  Querying ${index} (last ${ageHours}h${ruleName ? `, rule="${ruleName}"` : ''})...`
  );

  const { status, body } = await es.post(`/${index}/_search`, {
    size: maxAlerts,
    query: { bool: { must } },
    sort: [{ '@timestamp': 'desc' }],
  });

  if (status !== 200 || typeof body !== 'object' || body === null) {
    console.error(`  Query failed (${status}): ${JSON.stringify(body).slice(0, 300)}`);
    return [];
  }

  const result = body as Record<string, unknown>;
  const hits = ((result.hits as Record<string, unknown>)?.hits ?? []) as Array<
    Record<string, unknown>
  >;
  const total =
    ((result.hits as Record<string, unknown>)?.total as Record<string, unknown>)?.value ??
    hits.length;

  console.log(`  Found ${total} alerts, fetched ${hits.length}`);

  return hits.map((hit) => {
    const doc = hit._source as AlertDocument;
    // Preserve ES metadata so we can identify and update alerts
    doc._id = hit._id as string;
    doc._index = hit._index as string;
    return doc;
  });
}

// ============================================================
// Alert identification helpers
// ============================================================

/** Get a short identifier for an alert (event.id > _id > hash) */
const getAlertId = (alert: AlertDocument): string => {
  const eventId = getVal(alert, UNIQUE_FIELD);
  if (eventId != null) return String(eventId);
  if (alert._id) return String(alert._id);
  return JSON.stringify(alert).slice(0, 40);
};

/** Get a compact one-line summary of an alert for grouped display */
const getAlertSummary = (alert: AlertDocument): string => {
  const id = getAlertId(alert);
  const host = getVal(alert, 'host.name') ?? getVal(alert, 'agent.id') ?? '';
  const user = getVal(alert, 'user.name') ?? '';
  const process = getVal(alert, 'process.name') ?? '';
  const cmdLine = getVal(alert, 'process.command_line') ?? '';
  const filePath = getVal(alert, 'file.path') ?? '';
  const destIp = getVal(alert, 'destination.ip') ?? '';
  const timestamp = getVal(alert, '@timestamp') ?? '';

  const parts = [id];
  if (host) parts.push(`host=${host}`);
  if (user) parts.push(`user=${user}`);
  if (process) parts.push(`proc=${process}`);
  if (cmdLine) parts.push(`cmd=${String(cmdLine).slice(0, 80)}`);
  if (filePath) parts.push(`file=${filePath}`);
  if (destIp) parts.push(`dst=${destIp}`);
  if (timestamp) parts.push(`@${String(timestamp).slice(0, 19)}`);

  return parts.join(' | ');
};

// ============================================================
// Create LLM invoke function via Kibana connector
// ============================================================

function createKibanaLLMInvoke(kibana: KibanaClient, connectorId: string): LLMInvokeFn {
  return async (_system: string, prompt: string): Promise<string> => {
    const { status, body } = await kibana.post(`/api/actions/connector/${connectorId}/_execute`, {
      params: {
        subAction: 'invokeAI',
        subActionParams: {
          messages: [{ role: 'user' as const, content: prompt }],
        },
      },
    });

    if (status !== 200 || typeof body !== 'object' || body === null) {
      throw new Error(`LLM call failed (${status}): ${JSON.stringify(body).slice(0, 200)}`);
    }

    const result = body as Record<string, unknown>;
    const data = result.data as Record<string, unknown> | undefined;
    const message = (data?.message as string) ?? '';

    if (!message) {
      throw new Error(`Empty LLM response: ${JSON.stringify(data).slice(0, 200)}`);
    }

    return message;
  };
}

/**
 * Dry-run LLM invoke: always returns "not duplicate" so no LLM calls are made.
 */
const dryRunLLMInvoke: LLMInvokeFn = async () => {
  return '<result_marker>\n{"duplicate": false, "common_fields": []}\n</result_marker>';
};

// ============================================================
// Bulk-update alerts with cluster ID
// ============================================================

const CLUSTER_ID_FIELD = 'kibana.alert.cluster.id';

/**
 * Ensure the cluster ID field is mapped as a keyword in all target indices.
 * Required because the alerts index uses `dynamic: false`, so new fields
 * are stored in _source but not indexed unless explicitly mapped.
 */
async function ensureClusterIdMapping(es: ESClient, indices: Set<string>): Promise<void> {
  for (const index of indices) {
    const { status, body } = await es.request('PUT', `/${index}/_mapping`, {
      properties: {
        kibana: {
          properties: {
            alert: {
              properties: {
                cluster: {
                  properties: {
                    id: { type: 'keyword' },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (status !== 200) {
      console.warn(
        `  WARN: Failed to update mapping for ${index} (${status}): ${JSON.stringify(body).slice(
          0,
          200
        )}`
      );
    }
  }
}

interface ClusterUpdate {
  docId: string;
  docIndex: string;
  clusterId: string;
}

async function bulkUpdateClusterIds(
  es: ESClient,
  updates: ClusterUpdate[]
): Promise<{ success: number; failed: number }> {
  const BATCH_SIZE = 500;
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let offset = 0; offset < updates.length; offset += BATCH_SIZE) {
    const batch = updates.slice(offset, offset + BATCH_SIZE);
    const lines: string[] = [];

    for (const { docId, docIndex, clusterId } of batch) {
      lines.push(JSON.stringify({ update: { _index: docIndex, _id: docId } }));
      lines.push(JSON.stringify({ doc: { [CLUSTER_ID_FIELD]: clusterId } }));
    }

    const bulkBody = `${lines.join('\n')}\n`;
    const { status, body } = await es.post('/_bulk?refresh=true', bulkBody, 'application/x-ndjson');

    if ((status !== 200 && status !== 201) || typeof body !== 'object' || body === null) {
      console.error(
        `  ERROR: Bulk update failed (${status}): ${JSON.stringify(body).slice(0, 500)}`
      );
      totalFailed += batch.length;
      continue;
    }

    const result = body as {
      items?: Array<{
        update?: { _id: string; status: number; error?: { type: string; reason: string } };
      }>;
    };
    const items = result.items ?? [];
    let batchFailed = 0;

    for (const item of items) {
      if (item.update?.error) {
        batchFailed++;
        if (batchFailed <= 2) {
          console.error(
            `  ERROR: ${item.update.error.type}: ${item.update.error.reason.slice(0, 200)}`
          );
        }
      }
    }

    totalSuccess += items.length - batchFailed;
    totalFailed += batchFailed;

    if (updates.length > BATCH_SIZE) {
      console.log(
        `  Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ${items.length - batchFailed}/${
          batch.length
        } ok`
      );
    }
  }

  return { success: totalSuccess, failed: totalFailed };
}

// ============================================================
// Main
// ============================================================

interface ClusterAlertEntry {
  id: string;
  isLeader: boolean;
  host?: string;
  user?: string;
  process?: string;
  timestamp?: string;
  summary: string;
}

interface ClusterEntry {
  clusterId: number;
  clusterUUID: string;
  ruleName: string;
  alertCount: number;
  entities: Record<string, unknown>;
  commonFields: string[];
  exceptionCount: number;
  display: string;
  alerts: ClusterAlertEntry[];
}

interface DeduplicationReport {
  startedAt: string;
  completedAt: string;
  config: {
    distance: number;
    rankCutoff: number;
    ageHours: number;
    maxAlerts: number;
    ruleName?: string;
    dryRun: boolean;
  };
  totalAlerts: number;
  uniqueAlerts: number;
  totalClusters: number;
  llmCalls: number;
  durationMs: number;
  ruleGroups: Array<{
    ruleName: string;
    alertCount: number;
    clusters: number;
  }>;
  clusters: ClusterEntry[];
}

async function main(): Promise<void> {
  const args = parseConnectionArgs(process.argv);
  const connectorId = args.extra['connector-id'] ?? '';
  const ruleName = args.extra['rule-name'] ?? '';
  const distance = parseFloat(args.extra.distance ?? '0.004');
  const rankCutoff = parseInt(args.extra['rank-cutoff'] ?? '0', 10);
  const ageHours = parseInt(args.extra.age ?? '24', 10);
  const maxAlerts = parseInt(args.extra['max-alerts'] ?? '5000', 10);
  const outputFile = args.extra.output;
  const indexPattern = args.extra['index-pattern'] ?? '';
  const showGroups = args.extra['show-groups'] === 'true' || process.argv.includes('--show-groups');
  const updateAlerts =
    args.extra['update-alerts'] === 'true' || process.argv.includes('--update-alerts');
  const dryRun = args.dryRun;

  if (!args.esUrl) {
    console.error('ERROR: --es-url is required');
    process.exit(1);
  }
  if (!args.kibanaUrl) {
    args.kibanaUrl = args.esUrl.replace(/:\d+/, ':5601');
  }
  if (!connectorId && !dryRun) {
    console.error(
      'ERROR: --connector-id is required (or use --dry-run for vector-only clustering)'
    );
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
  });

  console.log(`\n── Hybrid Alert Deduplication Runner ──`);
  console.log(`  ES:            ${args.esUrl}`);
  console.log(`  Kibana:        ${args.kibanaUrl}`);
  console.log(`  Connector:     ${connectorId || '(none — dry run)'}`);
  console.log(`  Rule filter:   ${ruleName || '(all rules)'}`);
  console.log(`  Distance:      ${distance}`);
  console.log(`  Rank cutoff:   ${rankCutoff || '(disabled)'}`);
  console.log(`  Age:           ${ageHours}h`);
  console.log(`  Max alerts:    ${maxAlerts}`);
  console.log(`  Dry run:       ${dryRun}`);
  console.log(`  Index pattern: ${indexPattern || '.alerts-security.alerts-*'}`);

  console.log(`\n── Connecting ──`);
  const ok = await checkCluster(es);
  if (!ok) {
    process.exit(1);
  }

  const startedAt = new Date().toISOString();
  const totalStart = Date.now();

  // ── Step 1: Fetch alerts ──
  console.log(`\n── Step 1: Fetch Alerts ──`);
  let alerts = await fetchAlerts(es, {
    ruleName: ruleName || undefined,
    ageHours,
    maxAlerts,
    indexPattern: indexPattern || undefined,
  });

  if (alerts.length === 0) {
    console.log('  No alerts found. Exiting.');
    return;
  }

  // ── Step 2: Deduplicate by event.id ──
  console.log(`\n── Step 2: Deduplicate ──`);
  const seenIds = new Set<string>();
  const uniqueAlerts: AlertDocument[] = [];

  for (const alert of alerts) {
    const eventId = getVal(alert, UNIQUE_FIELD);
    const key = eventId != null ? String(eventId) : JSON.stringify(alert).slice(0, 200);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      uniqueAlerts.push(alert);
    }
  }
  alerts = uniqueAlerts;
  console.log(`  Unique alerts: ${alerts.length}`);

  // ── Step 3: Vectorize ──
  console.log(`\n── Step 3: Vectorize ──`);
  const vectorStart = Date.now();
  const enrichedAlerts: EnrichedAlert[] = alerts.map((alert) => ({
    ...alert,
    vector: getGenericAlertFeatureVector(alert),
  }));
  console.log(`  Vectorized ${enrichedAlerts.length} alerts in ${Date.now() - vectorStart}ms`);

  // ── Step 4: Group by rule name (optional overview) ──
  console.log(`\n── Step 4: Group by Rule Name ──`);
  const ruleGroups = groupByDistinctValue(enrichedAlerts, [...RULE_FIELDS]);
  for (const [rule, ruleAlerts] of ruleGroups) {
    console.log(`  ${rule}: ${ruleAlerts.length} alerts`);
  }

  // ── Step 5: Cluster ──
  console.log(`\n── Step 5: Hybrid Clustering ──`);
  const clusterStart = Date.now();

  const invokeLLM: LLMInvokeFn = dryRun
    ? dryRunLLMInvoke
    : createKibanaLLMInvoke(kibana, connectorId);

  const clustering = new HybridClustering({
    config: {
      highConfidenceThreshold: distance,
      rankCutoff: rankCutoff || undefined,
      debugging: !!process.env.DEBUG,
    },
    logger,
    invokeLLM,
  });

  let newLeaderCount = 0;
  let matchedCount = 0;

  for (let i = 0; i < enrichedAlerts.length; i++) {
    const alert = enrichedAlerts[i];
    const leader = await clustering.clusterAlert(alert);

    if (!leader) {
      // New leader created
      newLeaderCount++;
      const display = displayAlert(alert, alert.common_fields);
      console.log(`\n  ── NEW CLUSTER #${newLeaderCount} ──`);
      console.log(display);
    } else {
      matchedCount++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(
        `  Progress: ${i + 1}/${enrichedAlerts.length} alerts, ` +
          `${clustering.leaders.length} clusters, ` +
          `${clustering.llmCalls} LLM calls`
      );
    }
  }

  const clusterDurationMs = Date.now() - clusterStart;
  const totalDurationMs = Date.now() - totalStart;

  // ── Summary ──
  console.log(`\n══════════════════════════════════════`);
  console.log(`  DEDUPLICATION SUMMARY`);
  console.log(`══════════════════════════════════════`);
  console.log(`  Total alerts:    ${alerts.length}`);
  console.log(`  Unique alerts:   ${uniqueAlerts.length}`);
  console.log(`  Total clusters:  ${clustering.leaders.length}`);
  console.log(
    `  Matched:         ${matchedCount} (${((matchedCount / alerts.length) * 100).toFixed(
      1
    )}% reduction)`
  );
  console.log(`  LLM calls:       ${clustering.llmCalls}`);
  console.log(`  Cluster time:    ${(clusterDurationMs / 1000).toFixed(1)}s`);
  console.log(`  Total time:      ${(totalDurationMs / 1000).toFixed(1)}s`);

  // Per-rule breakdown
  console.log(`\n  Per-rule breakdown:`);
  const ruleGroupSummary: DeduplicationReport['ruleGroups'] = [];
  for (const [rule] of ruleGroups) {
    const ruleLeaders = clustering.leaders.filter((l) => getRuleName(l) === rule);
    console.log(`    ${rule}: ${ruleLeaders.length} clusters`);
    ruleGroupSummary.push({
      ruleName: rule,
      alertCount: ruleGroups.get(rule)?.length ?? 0,
      clusters: ruleLeaders.length,
    });
  }

  // ── Cluster details ──
  console.log(`\n  Cluster details:`);
  const clusterDetails: ClusterEntry[] = [];
  const clusterUpdates: ClusterUpdate[] = [];

  for (let i = 0; i < clustering.leaders.length; i++) {
    const leader = clustering.leaders[i];
    const rule = getRuleName(leader) ?? 'unknown';
    const followers = leader.followers ?? [];
    const followerCount = followers.length + 1;
    const commonFields = leader.common_fields ?? [];
    const exceptionCount = leader.exceptions?.length ?? 0;
    const clusterUUID = randomUUID();

    console.log(
      `\n  Cluster #${
        i + 1
      } [${clusterUUID}]: ${rule} (${followerCount} alerts, ${exceptionCount} exceptions)`
    );
    if (commonFields.length > 0) {
      console.log(`    Common fields: ${commonFields.join(', ')}`);
    }

    // Build alert membership for this cluster
    const buildAlertEntry = (alert: AlertDocument, isLeader: boolean): ClusterAlertEntry => ({
      id: getAlertId(alert),
      isLeader,
      host: getVal(alert, 'host.name') as string | undefined,
      user: getVal(alert, 'user.name') as string | undefined,
      process: getVal(alert, 'process.name') as string | undefined,
      timestamp: getVal(alert, '@timestamp') as string | undefined,
      summary: getAlertSummary(alert),
    });

    const clusterAlerts: ClusterAlertEntry[] = [
      buildAlertEntry(leader, true),
      ...followers.map((f) => buildAlertEntry(f, false)),
    ];

    // Show grouped alerts when --show-groups is on
    if (showGroups) {
      console.log(`    Alerts:`);
      for (const entry of clusterAlerts) {
        const marker = entry.isLeader ? '★' : ' ';
        console.log(`      ${marker} ${entry.summary}`);
      }
    }

    // Collect bulk-update entries for all alerts in this cluster
    const allClusterAlerts = [leader, ...followers];
    for (const alert of allClusterAlerts) {
      const docId = alert._id as string | undefined;
      const docIndex = alert._index as string | undefined;
      if (docId && docIndex) {
        clusterUpdates.push({ docId, docIndex, clusterId: clusterUUID });
      }
    }

    const display = displayAlert(leader, commonFields);
    clusterDetails.push({
      clusterId: i + 1,
      clusterUUID,
      ruleName: rule,
      alertCount: followerCount,
      entities: leader.entities ?? {},
      commonFields,
      exceptionCount,
      display,
      alerts: clusterAlerts,
    });
  }

  // ── Update alerts in Elasticsearch ──
  if (updateAlerts && clusterUpdates.length > 0) {
    console.log(`\n── Step 6: Update Alerts with Cluster IDs ──`);
    console.log(`  Field:   ${CLUSTER_ID_FIELD}`);
    console.log(`  Alerts:  ${clusterUpdates.length}`);

    // Ensure the field mapping exists so alerts are filterable
    const targetIndices = new Set(clusterUpdates.map((u) => u.docIndex));
    console.log(`  Indices: ${[...targetIndices].join(', ')}`);
    await ensureClusterIdMapping(es, targetIndices);
    console.log(`  Mapping: ok`);

    const { success, failed } = await bulkUpdateClusterIds(es, clusterUpdates);
    console.log(`  Updated: ${success} alerts`);
    if (failed > 0) {
      console.log(`  Failed:  ${failed} alerts`);
    }
  } else if (updateAlerts && clusterUpdates.length === 0) {
    console.log(`\n  No alerts to update.`);
  }

  // ── Output report ──
  if (outputFile) {
    const report: DeduplicationReport = {
      startedAt,
      completedAt: new Date().toISOString(),
      config: {
        distance,
        rankCutoff,
        ageHours,
        maxAlerts,
        ruleName: ruleName || undefined,
        dryRun,
      },
      totalAlerts: alerts.length,
      uniqueAlerts: uniqueAlerts.length,
      totalClusters: clustering.leaders.length,
      llmCalls: clustering.llmCalls,
      durationMs: totalDurationMs,
      ruleGroups: ruleGroupSummary,
      clusters: clusterDetails,
    };

    writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n  Results written to ${outputFile}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
