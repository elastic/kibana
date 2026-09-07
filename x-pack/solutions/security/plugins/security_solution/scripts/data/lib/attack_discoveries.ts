/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { KbnClient } from '@kbn/test';
import { formatError, getStatusCode, isRecord, isString } from './type_guards';

const ID_NAMESPACE = '3c0de8b5-1a9d-4d9f-9e2a-2fb3a58d6f9f';

// IMPORTANT:
// The Security Solution Attack Discovery UI derives the "attack chain" visualization from
// `attackDiscovery.mitreAttackTactics` and expects the tactic labels below.
// See `getTacticMetadata` in `@kbn/elastic-assistant-common`.
const MITRE_ATTACK_TACTICS_SUBSET = [
  'Reconnaissance',
  'Resource Development',
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
] as const;

const getDeterministicHexSeed = (seed: string): number => {
  // `seed` is typically a UUID. Convert it to a stable 32-bit number by taking the first 8 hex chars.
  const hex = seed.replace(/-/g, '').slice(0, 8);
  const n = Number.parseInt(hex, 16);
  return Number.isFinite(n) ? n : 0;
};

const pickMitreAttackTactics = (seed: string): string[] => {
  // Pick a contiguous range to look like a plausible "chain", while remaining deterministic.
  const n = getDeterministicHexSeed(seed);
  const minLen = 3;
  const maxLen = 7;
  const len = minLen + (n % (maxLen - minLen + 1));
  const maxStart = Math.max(0, MITRE_ATTACK_TACTICS_SUBSET.length - len);
  const start = maxStart === 0 ? 0 : Math.floor(n / 13) % (maxStart + 1);
  const slice = MITRE_ATTACK_TACTICS_SUBSET.slice(start, start + len);

  // Ensure we always have at least one of the most common mid-chain tactics so the UI is meaningful.
  // If the slice doesn't include Execution, add it (while keeping the set unique).
  const execution = 'Execution';
  if (!slice.includes(execution)) {
    return Array.from(new Set([...slice, execution]));
  }
  return [...slice];
};

const buildUniqueAttackDiscoveryTitle = ({
  discoveryKey,
  hostName,
  userName,
  discoveryTimeIso,
}: {
  discoveryKey: string;
  hostName?: string;
  userName?: string;
  discoveryTimeIso: string;
}): string => {
  const day = discoveryTimeIso.slice(0, 10);
  const shortId = uuidv5(discoveryKey, ID_NAMESPACE).split('-')[0];
  const hostLabel = hostName ?? 'unknown host';
  const userLabel = userName ? ` / ${userName}` : '';
  return `Attack discovery: ${hostLabel}${userLabel} (${day}) [${shortId}]`;
};

export interface GenerateAttackDiscoveriesOptions {
  startMs: number;
  endMs: number;
  maxAlertsToUse?: number;
  maxDiscoveries?: number;
}

export interface GeneratedAttackDiscoveryGroup {
  discoveryTimeIso: string;
  alertIds: string[];
  hostName?: string;
  userName?: string;
  title: string;
}

type AttackDiscoveryGroupSeed = Omit<GeneratedAttackDiscoveryGroup, 'title'>;

interface AlertSummary {
  id: string;
  timestamp: string;
  hostName?: string;
  userName?: string;
  ruleName?: string;
}

interface AlertSearchHitSource {
  '@timestamp'?: unknown;
  host?: { name?: unknown };
  user?: { name?: unknown };
  kibana?: { alert?: { rule?: { name?: unknown } } };
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const fetchAlertSummaries = async ({
  esClient,
  alertsIndex,
  startMs,
  endMs,
  maxAlerts,
}: {
  esClient: Client;
  alertsIndex: string;
  startMs: number;
  endMs: number;
  maxAlerts: number;
}): Promise<AlertSummary[]> => {
  // IMPORTANT:
  // Don't fetch "the first N alerts" in time order for large time ranges (e.g. 60d),
  // because that biases toward the earliest part of the window and causes Attack Discoveries
  // to cluster at the beginning of the range.
  //
  // Instead, sample alerts across the entire time range using a fixed number of time buckets.
  const results: AlertSummary[] = [];
  const rangeMs = endMs - startMs;
  const dayMs = 24 * 60 * 60 * 1000;
  const approxDays = Math.max(1, Math.ceil(rangeMs / dayMs));
  const bucketCount = Math.min(30, approxDays); // cap query count for speed
  const bucketMs = Math.max(1, Math.ceil(rangeMs / bucketCount));
  const perBucket = Math.max(1, Math.ceil(maxAlerts / bucketCount));

  for (let i = 0; i < bucketCount && results.length < maxAlerts; i++) {
    const bucketStartMs = startMs + i * bucketMs;
    const bucketEndMs = Math.min(endMs, bucketStartMs + bucketMs);
    const size = Math.min(perBucket, maxAlerts - results.length);

    const resp = await esClient.search<AlertSearchHitSource>({
      index: alertsIndex,
      size,
      sort: [{ '@timestamp': 'desc' }, { _shard_doc: 'desc' }],
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: new Date(bucketStartMs).toISOString(),
                  lte: new Date(bucketEndMs).toISOString(),
                },
              },
            },
          ],
        },
      },
      _source: ['@timestamp', 'host.name', 'user.name', 'kibana.alert.rule.name'],
    });

    for (const hit of resp.hits.hits) {
      const id = hit._id;
      const src = hit._source;
      const timestamp = asString(src?.['@timestamp']);
      if (id && timestamp) {
        results.push({
          id,
          timestamp,
          hostName: asString(src?.host?.name),
          userName: asString(src?.user?.name),
          ruleName: asString(src?.kibana?.alert?.rule?.name),
        });
      }
      if (results.length >= maxAlerts) break;
    }
  }

  return results;
};

const groupAlertsToDiscoveries = ({
  alerts,
  maxDiscoveries,
}: {
  alerts: AlertSummary[];
  maxDiscoveries: number;
}): AttackDiscoveryGroupSeed[] => {
  // Focus discoveries on only a few "risky" entities. In practice, those are the host/user pairs
  // with the most alerts in the requested time range.
  //
  // This avoids generating one discovery per host/user, which is not realistic.
  const byPair = new Map<string, AlertSummary[]>();
  for (const a of alerts) {
    const host = a.hostName ?? 'unknown-host';
    const user = a.userName ?? 'unknown-user';
    const key = `${host}::${user}`;
    const list = byPair.get(key) ?? [];
    list.push(a);
    byPair.set(key, list);
  }

  const discoveries: AttackDiscoveryGroupSeed[] = [];

  const focusPairsCount = Math.max(1, Math.min(3, byPair.size));
  const pairsByVolume = [...byPair.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, focusPairsCount);

  for (const [pairKey, pairAlerts] of pairsByVolume) {
    const [host, user] = pairKey.split('::');
    const byDay = new Map<string, AlertSummary[]>();
    for (const a of pairAlerts) {
      const day = a.timestamp?.slice(0, 10) ?? 'unknown-day';
      const list = byDay.get(day) ?? [];
      list.push(a);
      byDay.set(day, list);
    }

    for (const [, dayAlerts] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const alertIds = dayAlerts.slice(0, 20).map((a) => a.id); // keep small per discovery
      const discoveryTimeIso = dayAlerts[dayAlerts.length - 1].timestamp;
      discoveries.push({
        discoveryTimeIso,
        alertIds,
        hostName: host === 'unknown-host' ? undefined : host,
        userName: user === 'unknown-user' ? undefined : user,
      });
      if (discoveries.length >= maxDiscoveries) return discoveries;
    }
  }

  return discoveries;
};

const createAttackDiscoveriesViaKibana = async ({
  kbnClient,
  log,
  params,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  params: Record<string, unknown>;
}) => {
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/internal/elastic_assistant/data_generator/attack_discoveries/_create',
      // Force the requester to wrap response errors so we get structured status/response details.
      retries: 1,
      headers: {
        'kbn-xsrf': 'true',
        // Required by the server route to avoid accidental invocation.
        'x-elastic-internal-origin': 'Kibana',
        'elastic-api-version': '1',
      },
      body: params,
    });
  } catch (e) {
    const status = getStatusCode(e);
    const message = (() => {
      // Axios response error shape (KbnClient without wrapper)
      const response = isRecord(e) ? e.response : undefined;
      const data = isRecord(response) ? response.data : undefined;
      if (isRecord(data) && isString(data.message)) return data.message;
      if (isRecord(data) && isRecord(data.error) && isString(data.error.message))
        return data.error.message;

      // ES-style meta.body (used in other helpers in this scripts folder)
      const meta = isRecord(e) ? e.meta : undefined;
      const body = isRecord(meta) ? meta.body : undefined;
      if (isRecord(body) && isString(body.message)) return body.message;
      if (isRecord(body) && isRecord(body.error) && isString(body.error.message))
        return body.error.message;

      return undefined;
    })();

    log.error(
      `Attack Discovery data generator Kibana API call failed (status=${status ?? 'unknown'}). ${
        message ? `message=${message} ` : ''
      }error=${formatError(e)}`
    );
    throw e;
  }
};

export const generateAndIndexAttackDiscoveries = async ({
  esClient,
  kbnClient,
  log,
  spaceId,
  alertsIndex,
  authenticatedUsername,
  opts,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
  spaceId: string;
  alertsIndex: string;
  authenticatedUsername: string;
  opts: GenerateAttackDiscoveriesOptions;
}): Promise<GeneratedAttackDiscoveryGroup[]> => {
  const maxAlertsToUse = opts.maxAlertsToUse ?? 2000;
  const maxDiscoveries = opts.maxDiscoveries ?? 200;

  const alerts = await fetchAlertSummaries({
    esClient,
    alertsIndex,
    startMs: opts.startMs,
    endMs: opts.endMs,
    maxAlerts: maxAlertsToUse,
  });

  if (alerts.length === 0) {
    log.warning(
      `No Security alerts found in ${alertsIndex} within the requested time range. Skipping discoveries.`
    );
    return [];
  }

  const discoveryGroups = groupAlertsToDiscoveries({ alerts, maxDiscoveries });

  const commonParams = {
    alertsContextCount: 0,
    anonymizedAlerts: [],
    apiConfig: {
      actionTypeId: 'none',
      connectorId: 'none',
      model: 'none',
    },
    connectorName: 'Synthetic (no-LLM)',
    enableFieldRendering: true,
    replacements: undefined,
    withReplacements: false,
  };

  const generatedGroups: GeneratedAttackDiscoveryGroup[] = [];

  const attackDiscoveries: AttackDiscovery[] = [];
  for (const g of discoveryGroups) {
    // Deterministic fallback: if a group timestamp is missing/invalid (shouldn't happen with real alerts),
    // fall back to the generator's end-of-window time.
    const fallbackIso = new Date(opts.endMs).toISOString();
    const discoveryTimeIso = (() => {
      const ts = g.discoveryTimeIso;
      const d = new Date(ts);
      return Number.isFinite(d.getTime()) ? ts : fallbackIso;
    })();

    const discoveryKey = [
      spaceId,
      discoveryTimeIso,
      g.hostName ?? 'unknown-host',
      g.userName ?? 'unknown-user',
      g.alertIds.join(','),
    ].join('|');

    const generationUuid = uuidv5(discoveryKey, ID_NAMESPACE);
    const title = buildUniqueAttackDiscoveryTitle({
      discoveryKey,
      hostName: g.hostName,
      userName: g.userName,
      discoveryTimeIso,
    });
    const attack: AttackDiscovery = {
      alertIds: g.alertIds,
      title,
      summaryMarkdown: `Detected ${g.alertIds.length} alert(s) that appear related.`,
      entitySummaryMarkdown: g.hostName
        ? `Host {{ host.name ${g.hostName} }}${
            g.userName ? ` User {{ user.name ${g.userName} }}` : ''
          }`
        : undefined,
      detailsMarkdown:
        `This synthetic attack discovery groups alerts that occurred close in time for investigation.\n\n` +
        `- Alerts: ${g.alertIds.length}\n${
          g.hostName ? `- Host: {{ host.name ${g.hostName} }}\n` : ''
        }${g.userName ? `- User: {{ user.name ${g.userName} }}\n` : ''}`,
      // Drives the "attack chain" visualization in the UI.
      mitreAttackTactics: pickMitreAttackTactics(generationUuid),
      timestamp: discoveryTimeIso,
    };

    generatedGroups.push({
      ...g,
      discoveryTimeIso,
      title,
    });
    attackDiscoveries.push(attack);
  }

  const generationUuid = uuidv5(
    `${spaceId}|${authenticatedUsername}|${opts.startMs}|${opts.endMs}|${attackDiscoveries.length}`,
    ID_NAMESPACE
  );
  await createAttackDiscoveriesViaKibana({
    kbnClient,
    log,
    params: {
      ...commonParams,
      alertsContextCount: Math.max(0, alerts.length),
      attackDiscoveries,
      generationUuid,
    },
  });

  return generatedGroups;
};
