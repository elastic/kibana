/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import type { Client } from '@elastic/elasticsearch';
import type {
  BulkOperationType,
  BulkResponseItem,
  SortResults,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AuthenticatedUser } from '@kbn/core/server';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { transformToAlertDocuments } from '@kbn/elastic-assistant-plugin/server/lib/attack_discovery/persistence/transforms/transform_to_alert_documents';
import { attackDiscoveryAlertFieldMap } from '@kbn/elastic-assistant-plugin/server/lib/attack_discovery/schedules/fields';

const ALERT_UUID = 'kibana.alert.uuid';
const ID_NAMESPACE = '3c0de8b5-1a9d-4d9f-9e2a-2fb3a58d6f9f';

export interface GenerateAttackDiscoveriesOptions {
  startMs: number;
  endMs: number;
  maxAlertsToUse?: number;
  maxDiscoveries?: number;
}

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
}): Array<{
  discoveryTimeIso: string;
  alertIds: string[];
  hostName?: string;
  userName?: string;
}> => {
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

  const discoveries: Array<{
    discoveryTimeIso: string;
    alertIds: string[];
    hostName?: string;
    userName?: string;
  }> = [];

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

const getAdhocAttackDiscoveryBackingIndex = (
  spaceId: string
): {
  internalAlias: string;
  publicAlias: string;
  backingIndex: string;
} => {
  // Matches the rule-registry created index naming used by the Elastic Assistant plugin for ad-hoc discoveries.
  // Example: .internal.adhoc.alerts-security.attack.discovery.alerts-default-000001
  const publicAlias = `.adhoc.alerts-security.attack.discovery.alerts-${spaceId}`;
  const internalAlias = `.internal${publicAlias}`;
  return { internalAlias, publicAlias, backingIndex: `${internalAlias}-000001` };
};

const ensureAdhocAttackDiscoveryIndex = async ({
  esClient,
  log,
  spaceId,
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
}): Promise<string> => {
  const { internalAlias, publicAlias, backingIndex } = getAdhocAttackDiscoveryBackingIndex(spaceId);

  const exists = await esClient.indices.exists({ index: backingIndex });
  if (exists) {
    // Our ad-hoc index is expected to behave like rule-registry managed indices, which include ECS mappings.
    // If the index was created without ECS mappings, strict mappings will reject documents that contain `ecs.*`.
    await esClient.indices.putMapping({
      index: backingIndex,
      properties: {
        ecs: {
          type: 'object',
          properties: {
            version: { type: 'keyword' },
          },
        },
      },
    });

    // Ensure both aliases exist. The Attack Discovery server routes use the public alias
    // (e.g. ".adhoc.alerts-security.attack.discovery.alerts-default"), while the backing
    // indices live under ".internal.*".
    await esClient.indices.putAlias({ index: backingIndex, name: internalAlias });
    await esClient.indices.putAlias({ index: backingIndex, name: publicAlias });
    return backingIndex;
  }

  log.info(`Creating ad-hoc Attack Discovery backing index: ${backingIndex}`);

  const baseMappings: MappingTypeMapping = mappingFromFieldMap(attackDiscoveryAlertFieldMap);
  const mappings: MappingTypeMapping = {
    ...baseMappings,
    properties: {
      ...(baseMappings?.properties ?? {}),
      ecs: {
        type: 'object',
        properties: {
          version: { type: 'keyword' },
        },
      },
    },
  };

  await esClient.indices.create({
    index: backingIndex,
    // Keep this hidden like other internal alert indices
    settings: {
      index: {
        hidden: true,
      },
    },
    mappings,
    aliases: {
      // The alias is what callers typically use for reads; keeping it aligned with Kibana conventions helps UX.
      [internalAlias]: {},
      [publicAlias]: {},
    },
  });

  return backingIndex;
};

export const generateAndIndexAttackDiscoveries = async ({
  esClient,
  log,
  spaceId,
  alertsIndex,
  authenticatedUsername,
  opts,
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
  alertsIndex: string;
  authenticatedUsername: string;
  opts: GenerateAttackDiscoveriesOptions;
}) => {
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
    return;
  }

  const discoveryGroups = groupAlertsToDiscoveries({ alerts, maxDiscoveries });
  const attackDiscoveryIndex = await ensureAdhocAttackDiscoveryIndex({ esClient, log, spaceId });

  log.info(
    `Generating ${discoveryGroups.length} synthetic Attack Discoveries into ${attackDiscoveryIndex}`
  );

  const authenticatedUser: AuthenticatedUser = {
    // IMPORTANT:
    // The Attack Discovery "find" API filters results to the current user unless "shared" is requested.
    // If we attribute docs to a different username, they won't show up in the UI for the logged-in user.
    username: authenticatedUsername,
    roles: [],
    enabled: true,
    authentication_realm: { name: 'scripts', type: 'scripts' },
    lookup_realm: { name: 'scripts', type: 'scripts' },
    authentication_provider: { type: 'scripts', name: 'scripts' },
    authentication_type: 'realm',
    elastic_cloud_user: false,
    // `profile_uid` is only used if `username` is empty; keep it stable anyway.
    profile_uid: authenticatedUsername,
  };

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

  const bulkBody: Array<Record<string, unknown>> = [];

  for (const g of discoveryGroups) {
    const discoveryKey = [
      spaceId,
      g.discoveryTimeIso,
      g.hostName ?? 'unknown-host',
      g.userName ?? 'unknown-user',
      g.alertIds.join(','),
    ].join('|');

    const attack: AttackDiscovery = {
      alertIds: g.alertIds,
      title: g.hostName ? `Attack discovery on ${g.hostName}` : `Attack discovery on unknown host`,
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
      mitreAttackTactics: [],
      timestamp: g.discoveryTimeIso,
    };

    const now = new Date(g.discoveryTimeIso);
    const docs = transformToAlertDocuments({
      authenticatedUser,
      createAttackDiscoveryAlertsParams: {
        ...commonParams,
        alertsContextCount: g.alertIds.length,
        attackDiscoveries: [attack],
        // Deterministic so repeated runs overwrite the same docs.
        generationUuid: uuidv5(discoveryKey, ID_NAMESPACE),
      },
      now,
      spaceId,
    });

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i] as unknown as Record<string, unknown>;
      const id = uuidv5(`${discoveryKey}|doc:${i}`, ID_NAMESPACE);
      // Force deterministic ids regardless of any internal transform behavior.
      doc[ALERT_UUID] = id;

      // Use "index" so repeated runs are idempotent (same deterministic ids).
      bulkBody.push(
        { index: { _index: attackDiscoveryIndex, _id: id } },
        doc
      );
    }
  }

  const resp = await esClient.bulk({ refresh: true, body: bulkBody });
  if (resp.errors) {
    const first = (resp.items ?? []).find(
      (item: Partial<Record<BulkOperationType, BulkResponseItem>>) => {
        const op = item.index ?? item.create ?? item.update ?? item.delete;
        return Boolean(op?.error);
      }
    );
    const op = first?.index ?? first?.create ?? first?.update ?? first?.delete;
    if (op?.error) {
      log.error(
        `Attack Discovery bulk indexing error (status=${op.status}): ${JSON.stringify(op.error)}`
      );
    }
    throw new Error(`Failed to index Attack Discoveries into ${attackDiscoveryIndex}`);
  }
};
