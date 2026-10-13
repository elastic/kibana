/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_ATTACK_DISCOVERY_USERS_ID,
  ALERT_ATTACK_DISCOVERY_USERS_NAME,
  ALERT_RISK_SCORE,
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { uniq, uniqBy } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type { Entity } from '@kbn/entity-store/common';
import type {
  Fact,
  Severity,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import {
  RISK_SCORE_CRITICAL,
  RISK_SCORE_HIGH,
  RISK_SCORE_MEDIUM,
} from '../../../../../common/detection_engine/constants';
import { getErrorMessage } from '../../../../utils/error_helpers';
import { getAlertEntities } from '../../../../workflows/step_types/get_alert_entities_step/get_alert_entities';
import { minimalEntityRecord } from './engine/entity_record';
import { resolveEntities } from './engine/resolve_entities';
import { SignalUnavailableError } from './engine/run_signals';
import type { Signal, SignalInput } from './engine/types';

const SIGNAL_ID = 'attack_discoveries';
const MAX_DISCOVERIES = 10;
const DISCOVERY_CANDIDATES = 30;
const DISCOVERY_JACCARD_THRESHOLD = 0.5;
const MAX_ALERT_IDS_PER_DISCOVERY = 1000;
const MAX_ENTITIES_PER_DISCOVERY = 12;
/** Alert entities read per discovery, before aliases collapse onto golden entities. */
const MAX_RAW_ENTITIES_PER_DISCOVERY = 30;

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

/** A discovery's risk score is the sum of its alerts' scores; their average maps like a rule's. */
export const severityOf = (riskScore: number, alertCount: number): Severity => {
  const averageRisk = riskScore / alertCount;
  if (averageRisk >= RISK_SCORE_CRITICAL) {
    return 'critical';
  }
  if (averageRisk >= RISK_SCORE_HIGH) {
    return 'high';
  }
  if (averageRisk >= RISK_SCORE_MEDIUM) {
    return 'medium';
  }
  return 'low';
};

const parseDiscovery = ({ _id: id, fields = {} }: estypes.SearchHit): Discovery | undefined => {
  const strings = (field: string): string[] =>
    (fields[field] ?? []).filter((value: unknown): value is string => typeof value === 'string');
  const [timestamp] = strings('@timestamp');
  const alertIds = uniq(strings(ALERT_ATTACK_DISCOVERY_ALERT_IDS)).sort();
  if (!id || alertIds.length === 0 || !timestamp) {
    return undefined;
  }
  const [riskScore] = fields[ALERT_RISK_SCORE] ?? [];
  const [title] = strings(ALERT_ATTACK_DISCOVERY_TITLE);
  const [status] = strings(ALERT_WORKFLOW_STATUS);
  return {
    id,
    title: title || 'Attack discovery',
    severity: typeof riskScore === 'number' ? severityOf(riskScore, alertIds.length) : undefined,
    status: status === 'acknowledged' ? 'acknowledged' : 'open',
    alertIds,
    timestamp,
    tactics: strings(ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS),
  };
};

const jaccard = (a: string[], b: string[]): number => {
  const setB = new Set(b);
  const intersection = a.filter((id) => setB.has(id)).length;
  return intersection / new Set([...a, ...b]).size;
};

/** Shared discoveries (no users) and the user's own, by name or profile id as Attack Discovery does. */
const visibleTo = ({ username, profileId }: SignalInput): estypes.QueryDslQueryContainer => {
  const owners: estypes.QueryDslQueryContainer[] = [
    { term: { [ALERT_ATTACK_DISCOVERY_USERS_ID]: profileId } },
  ];
  if (username) {
    owners.push({ term: { [ALERT_ATTACK_DISCOVERY_USERS_NAME]: username } });
  }
  const hasUsers = { exists: { field: ALERT_ATTACK_DISCOVERY_USERS_NAME } };
  return {
    bool: {
      should: [
        {
          bool: { must_not: [{ nested: { path: ALERT_ATTACK_DISCOVERY_USERS, query: hasUsers } }] },
        },
        { nested: { path: ALERT_ATTACK_DISCOVERY_USERS, query: { bool: { should: owners } } } },
      ],
      minimum_should_match: 1,
    },
  };
};

/**
 * Discoveries in the window the user can see (never another analyst's private one), not closed,
 * highest total risk then newest first. Scheduled runs regenerate overlapping discoveries for the
 * same attack, so a discovery whose alerts overlap a kept one by at least 0.5 is dropped.
 */
const fetchDiscoveries = async (input: SignalInput): Promise<Discovery[]> => {
  const { esClient, spaceId, timeRange, abortSignal } = input;
  const response = await esClient.search(
    {
      index: [
        `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
        `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
      ],
      // Either index may be missing; with both missing no discovery has run (no shards).
      ignore_unavailable: true,
      size: DISCOVERY_CANDIDATES,
      _source: false,
      fields: [
        '@timestamp',
        ALERT_ATTACK_DISCOVERY_ALERT_IDS,
        ALERT_ATTACK_DISCOVERY_TITLE,
        ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
        ALERT_RISK_SCORE,
        ALERT_WORKFLOW_STATUS,
      ],
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
            visibleTo(input),
          ],
          must_not: [{ term: { [ALERT_WORKFLOW_STATUS]: 'closed' } }],
        },
      },
      sort: [
        { [ALERT_RISK_SCORE]: { order: 'desc', unmapped_type: 'float' } },
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
  { esClient, spaceId, abortSignal, logger }: SignalInput,
  discoveries: Discovery[]
) =>
  Promise.all(
    discoveries.map(({ id, alertIds }) =>
      getAlertEntities({
        abortSignal,
        alertIds: alertIds.slice(0, MAX_ALERT_IDS_PER_DISCOVERY),
        entityTypes: ['user', 'host', 'service'],
        esClient,
        maxEntities: MAX_RAW_ENTITIES_PER_DISCOVERY,
        spaceId,
      }).then(
        ({ entities }) => entities,
        (error: unknown) => {
          logger.warn(`[executive brief] entities of discovery ${id}: ${getErrorMessage(error)}`);
          return [];
        }
      )
    )
  );

const toFact = (discovery: Discovery, entities: Entity[]): Omit<Fact, 'id'> => {
  const details: Record<string, string> = { status: discovery.status };
  if (discovery.tactics.length > 0) {
    details.tactics = discovery.tactics.join(', ');
  }
  return {
    signalId: SIGNAL_ID,
    title: discovery.title,
    timestamp: discovery.timestamp,
    severity: discovery.severity,
    entityIds: entities.flatMap(({ entity }) => (entity?.id ? [entity.id] : [])),
    numbers: { alerts: discovery.alertIds.length },
    details,
    source: { type: 'attack_discovery', id: discovery.id },
  };
};

/** Attack discoveries as facts about the golden entities of their alerts. */
export const attackDiscoveriesSignal: Signal = {
  id: SIGNAL_ID,
  title: 'Attack discoveries',
  run: async (input) => {
    const discoveries = await fetchDiscoveries(input);
    if (discoveries.length === 0) {
      return { facts: [], entities: [] };
    }
    const entitiesByDiscovery = await fetchAlertEntities(input, discoveries);
    const resolved = await resolveEntities({
      resolutionClient: input.resolutionClient,
      euids: entitiesByDiscovery.flat().map(({ id }) => id),
      abortSignal: input.abortSignal,
    }).catch((error: unknown) => {
      input.logger.debug(
        `[executive brief] discovery entity resolution failed: ${getErrorMessage(error)}`
      );
      return new Map<string, Entity>();
    });

    const recordsByDiscovery = entitiesByDiscovery.map((alertEntities) => {
      const records = alertEntities.map(
        ({ id, name, type }) => resolved.get(id) ?? minimalEntityRecord({ id, type, name })
      );
      return uniqBy(records, ({ entity }) => entity?.id).slice(0, MAX_ENTITIES_PER_DISCOVERY);
    });
    return {
      facts: discoveries.map((discovery, index) => toFact(discovery, recordsByDiscovery[index])),
      entities: recordsByDiscovery.flat(),
    };
  },
};
