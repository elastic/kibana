/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type { Entity } from '@kbn/entity-store/common';
import type { Severity } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { getAttackDiscoveryAlertsIndices } from '../../../detection_engine/routes/common/index_patterns/get_attack_alerts_index';
import { getAlertEntities } from '../../../../workflows/step_types/get_alert_entities_step/get_alert_entities';
import { minimalEntityRecord } from '../entity_record';
import {
  SignalUnavailableError,
  compareStrings,
  defineSignal,
  errorMessage,
} from './engine/define_signal';
import { resolveEntities } from './engine/resolve_entities';
import type { FactDraft, SignalContext } from './engine/types';

const MAX_DISCOVERIES = 10;
const DISCOVERY_CANDIDATES = 30;
const DISCOVERY_JACCARD_THRESHOLD = 0.5;
const MAX_ALERT_IDS_PER_DISCOVERY = 1000;
const MAX_ENTITIES_PER_DISCOVERY = 12;
/** Alert entities read per discovery, before aliases collapse onto golden entities. */
const MAX_RAW_ENTITIES_PER_DISCOVERY = 30;

const USERS_PATH = 'kibana.alert.attack_discovery.users';
const FIELDS = {
  alertIds: 'kibana.alert.attack_discovery.alert_ids',
  title: 'kibana.alert.attack_discovery.title',
  tactics: 'kibana.alert.attack_discovery.mitre_attack_tactics',
  riskScore: 'kibana.alert.risk_score',
  status: 'kibana.alert.workflow_status',
} as const;

interface Discovery {
  id: string;
  title: string;
  severity?: Severity;
  status: 'open' | 'acknowledged';
  /** Unique and sorted. */
  alertIds: string[];
  timestamp: string;
  tactics: string[];
}

/** Detection risk score (0-100) to severity, using the detection engine's default bands. */
const severityFromRiskScore = (score: number): Severity =>
  score >= 74 ? 'critical' : score >= 48 ? 'high' : score >= 22 ? 'medium' : 'low';

const parseDiscovery = ({ _id: id, fields = {} }: estypes.SearchHit): Discovery | undefined => {
  const values = (field: string): unknown[] => fields[field] ?? [];
  const strings = (field: string) =>
    values(field).filter((v): v is string => typeof v === 'string');
  const [timestamp] = strings('@timestamp');
  const [title] = strings(FIELDS.title);
  const [riskScore] = values(FIELDS.riskScore);
  const alertIds = [...new Set(strings(FIELDS.alertIds))].sort(compareStrings);
  if (!id || alertIds.length === 0 || !timestamp) {
    return undefined;
  }
  return {
    id,
    title: title || 'Attack discovery',
    ...(typeof riskScore === 'number' ? { severity: severityFromRiskScore(riskScore) } : {}),
    status: strings(FIELDS.status)[0] === 'acknowledged' ? 'acknowledged' : 'open',
    alertIds,
    timestamp,
    tactics: strings(FIELDS.tactics),
  };
};

const jaccard = (a: string[], b: string[]): number => {
  const setB = new Set(b);
  const intersection = a.filter((id) => setB.has(id)).length;
  return intersection / new Set([...a, ...b]).size;
};

/**
 * Discoveries in the window the user can see (own or shared: never another analyst's private one),
 * not closed, highest risk then newest first. Scheduled runs regenerate overlapping discoveries for
 * the same attack, so a discovery whose alerts overlap a kept one by at least 0.5 is dropped.
 */
const fetchDiscoveries = async (
  { esClient, spaceId, timeRange, username }: SignalContext,
  abortSignal: AbortSignal
): Promise<Discovery[]> => {
  const shared = {
    bool: {
      must_not: [
        { nested: { path: USERS_PATH, query: { exists: { field: `${USERS_PATH}.name` } } } },
      ],
    },
  };
  const own = {
    nested: { path: USERS_PATH, query: { term: { [`${USERS_PATH}.name`]: username } } },
  };
  const response = await esClient.search(
    {
      index: getAttackDiscoveryAlertsIndices(spaceId),
      // Either index may be missing; with both missing no discovery has run (no shards).
      ignore_unavailable: true,
      size: DISCOVERY_CANDIDATES,
      _source: false,
      fields: ['@timestamp', ...Object.values(FIELDS)],
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
            { bool: { should: username ? [shared, own] : [shared], minimum_should_match: 1 } },
          ],
          must_not: [{ term: { [FIELDS.status]: 'closed' } }],
        },
      },
      sort: [
        { [FIELDS.riskScore]: { order: 'desc', unmapped_type: 'float' } },
        { '@timestamp': 'desc' },
      ],
    },
    { signal: abortSignal }
  );
  if (response._shards.total === 0) {
    throw new SignalUnavailableError('Attack Discovery has not run in this space yet.');
  }

  const kept: Discovery[] = [];
  for (const discovery of response.hits.hits.flatMap((hit) => parseDiscovery(hit) ?? [])) {
    const { alertIds } = discovery;
    if (!kept.some((other) => jaccard(other.alertIds, alertIds) >= DISCOVERY_JACCARD_THRESHOLD)) {
      kept.push(discovery);
    }
  }
  return kept.slice(0, MAX_DISCOVERIES);
};

/** Each discovery's alert entities, most alerted first; a discovery whose alerts fail has none. */
const fetchAlertEntities = (
  ctx: SignalContext,
  discoveries: Discovery[],
  abortSignal: AbortSignal
) =>
  Promise.all(
    discoveries.map(({ id, alertIds }) =>
      getAlertEntities({
        abortSignal,
        alertIds: alertIds.slice(0, MAX_ALERT_IDS_PER_DISCOVERY),
        entityTypes: ['user', 'host', 'service'],
        esClient: ctx.esClient,
        maxEntities: MAX_RAW_ENTITIES_PER_DISCOVERY,
        spaceId: ctx.spaceId,
      }).then(
        ({ entities }) => entities,
        (error: unknown) => {
          ctx.logger.warn(`[executive brief] entities of discovery ${id}: ${errorMessage(error)}`);
          return [];
        }
      )
    )
  );

/** Attack discoveries as facts about the golden entities of their alerts. */
export const attackDiscoveriesSignal = defineSignal({
  id: 'attack_discoveries',
  title: 'Attack discoveries',
  run: async (ctx, abortSignal) => {
    const discoveries = await fetchDiscoveries(ctx, abortSignal);
    if (discoveries.length === 0) {
      return [];
    }
    const entitiesByDiscovery = await fetchAlertEntities(ctx, discoveries, abortSignal);
    const resolved = await resolveEntities({
      esClient: ctx.esClient,
      spaceId: ctx.spaceId,
      euids: entitiesByDiscovery.flat().map(({ id }) => id),
      abortSignal,
    }).catch((error: unknown) => {
      ctx.logger.debug(
        `[executive brief] discovery entity resolution failed: ${errorMessage(error)}`
      );
      return new Map<string, Entity>();
    });

    return discoveries.map((discovery, index): FactDraft => {
      const records = entitiesByDiscovery[index].map(
        ({ id, name, type }) => resolved.get(id) ?? minimalEntityRecord({ id, type, name })
      );
      return {
        title: discovery.title,
        timestamp: discovery.timestamp,
        ...(discovery.severity ? { severity: discovery.severity } : {}),
        entities: uniqBy(records, ({ entity }) => entity?.id).slice(0, MAX_ENTITIES_PER_DISCOVERY),
        numbers: { alerts: discovery.alertIds.length },
        details: {
          status: discovery.status,
          ...(discovery.tactics.length > 0 ? { tactics: discovery.tactics.join(', ') } : {}),
        },
        source: { type: 'attack_discovery', id: discovery.id },
      };
    });
  },
});
