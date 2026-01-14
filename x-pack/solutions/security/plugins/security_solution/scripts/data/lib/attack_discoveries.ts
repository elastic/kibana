/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { transformToAlertDocuments } from '../../../../elastic_assistant/server/lib/attack_discovery/persistence/transforms/transform_to_alert_documents';

const ALERT_UUID = 'kibana.alert.uuid';

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
  const results: AlertSummary[] = [];
  let searchAfter: unknown[] | undefined;

  while (results.length < maxAlerts) {
    const resp = await esClient.search<unknown>({
      index: alertsIndex,
      size: Math.min(1000, maxAlerts - results.length),
      sort: [{ '@timestamp': 'asc' }, { _shard_doc: 'asc' }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: new Date(startMs).toISOString(), lte: new Date(endMs).toISOString() } } },
          ],
        },
      },
      _source: ['@timestamp', 'host.name', 'user.name', 'kibana.alert.rule.name'],
    });

    const hits = resp.hits.hits;
    if (hits.length === 0) break;

    for (const hit of hits) {
      const src = hit._source as any;
      results.push({
        id: hit._id!,
        timestamp: src?.['@timestamp'],
        hostName: src?.host?.name,
        userName: src?.user?.name,
        ruleName: src?.kibana?.alert?.rule?.name,
      });
    }

    searchAfter = hits[hits.length - 1].sort;
    if (!searchAfter) break;
  }

  return results;
};

const groupAlertsToDiscoveries = ({
  alerts,
  maxDiscoveries,
}: {
  alerts: AlertSummary[];
  maxDiscoveries: number;
}): Array<{ discoveryTimeIso: string; alertIds: string[]; hostName?: string; userName?: string }> => {
  // Group by host, then bucket by day to spread discoveries across the full window.
  const byHost = new Map<string, AlertSummary[]>();
  for (const a of alerts) {
    const key = a.hostName ?? 'unknown-host';
    const list = byHost.get(key) ?? [];
    list.push(a);
    byHost.set(key, list);
  }

  const discoveries: Array<{ discoveryTimeIso: string; alertIds: string[]; hostName?: string; userName?: string }> = [];

  for (const [host, hostAlerts] of byHost.entries()) {
    const byDay = new Map<string, AlertSummary[]>();
    for (const a of hostAlerts) {
      const day = a.timestamp?.slice(0, 10) ?? 'unknown-day';
      const list = byDay.get(day) ?? [];
      list.push(a);
      byDay.set(day, list);
    }

    for (const [day, dayAlerts] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const alertIds = dayAlerts.slice(0, 20).map((a) => a.id); // keep small per discovery
      const discoveryTimeIso = dayAlerts[dayAlerts.length - 1].timestamp;
      const userName = dayAlerts.find((a) => a.userName)?.userName;
      discoveries.push({
        discoveryTimeIso,
        alertIds,
        hostName: host === 'unknown-host' ? undefined : host,
        userName,
      });
      if (discoveries.length >= maxDiscoveries) return discoveries;
    }
  }

  return discoveries;
};

export const generateAndIndexAttackDiscoveries = async ({
  esClient,
  log,
  spaceId,
  alertsIndex,
  opts,
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
  alertsIndex: string;
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
    log.warning(`No Security alerts found in ${alertsIndex} within the requested time range. Skipping discoveries.`);
    return;
  }

  const discoveryGroups = groupAlertsToDiscoveries({ alerts, maxDiscoveries });
  const attackDiscoveryIndex = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`;

  log.info(`Generating ${discoveryGroups.length} synthetic Attack Discoveries into ${attackDiscoveryIndex}`);

  const authenticatedUser = {
    username: 'data-generator',
    profile_uid: 'data-generator',
  } as any;

  const commonParams = {
    alertsContextCount: 0,
    anonymizedAlerts: [],
    apiConfig: {
      actionTypeId: 'none',
      connectorId: 'none',
      model: 'none',
      provider: 'none',
    },
    connectorName: 'Synthetic (no-LLM)',
    enableFieldRendering: true,
    replacements: undefined,
    withReplacements: false,
  };

  const bulkBody: Array<Record<string, unknown>> = [];

  for (const g of discoveryGroups) {
    const attack: AttackDiscovery = {
      alertIds: g.alertIds,
      title: g.hostName
        ? `Attack discovery on ${g.hostName}`
        : `Attack discovery on unknown host`,
      summaryMarkdown: `Detected ${g.alertIds.length} alert(s) that appear related.`,
      entitySummaryMarkdown: g.hostName
        ? `Host {{ host.name ${g.hostName} }}${g.userName ? ` User {{ user.name ${g.userName} }}` : ''}`
        : undefined,
      detailsMarkdown:
        `This synthetic attack discovery groups alerts that occurred close in time for investigation.\n\n` +
        `- Alerts: ${g.alertIds.length}\n` +
        (g.hostName ? `- Host: {{ host.name ${g.hostName} }}\n` : '') +
        (g.userName ? `- User: {{ user.name ${g.userName} }}\n` : ''),
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
        generationUuid: uuidv4(),
      },
      now,
      spaceId,
    });

    for (const doc of docs) {
      const id = (doc as any)[ALERT_UUID];
      bulkBody.push({ create: { _index: attackDiscoveryIndex, _id: id } }, doc as any);
    }
  }

  const resp = await esClient.bulk({ refresh: true, body: bulkBody });
  if (resp.errors) {
    throw new Error(`Failed to index Attack Discoveries into ${attackDiscoveryIndex}`);
  }
};

