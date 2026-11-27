/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_ORIGINAL_TIME } from '../../../../../../../common/field_maps/field_names';
import type { DetectionAlertLatest } from '../../../../../../../common/api/detection_engine/model/alerts';
import type { IRuleExecutionLogForExecutors } from '../../../../rule_monitoring';
import type { EventsForEnrichment } from '../types';
import { getEventValue } from './events';

export const AI_AGENT_PROCESS_EVENTS_INDEX = 'logs-endpoint.events.process-*';

/** An agent process can run for days before it spawns the descendant that alerted. */
const ANCESTOR_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/** Bounded by `index.max_result_window`, since each ancestor ID returns at most one hit. */
const MAX_ANCESTOR_IDS = 10_000;

const getEventValues = <T extends DetectionAlertLatest>(
  event: EventsForEnrichment<T>,
  path: string
): unknown[] => {
  const value: unknown = get(event, `_source.${path}`) ?? get(event, ['_source', path]);
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const isAiAgentDescendant = <T extends DetectionAlertLatest>(
  event: EventsForEnrichment<T>
): boolean => String(getEventValue(event, 'process.ai_agent.is_descendant')) === 'true';

/** Ancestor process entity IDs, nearest first. `process.Ext.ancestry` lists the parent first. */
const getAncestorEntityIds = <T extends DetectionAlertLatest>(
  event: EventsForEnrichment<T>
): string[] => [
  ...new Set(
    [
      ...getEventValues(event, 'process.parent.entity_id'),
      ...getEventValues(event, 'process.Ext.ancestry'),
    ].filter((id): id is string => typeof id === 'string' && id !== '')
  ),
];

const getEventTimeMs = <T extends DetectionAlertLatest>(event: EventsForEnrichment<T>): number =>
  Date.parse(getEventValue(event, ALERT_ORIGINAL_TIME) ?? getEventValue(event, '@timestamp') ?? '');

/**
 * Finds the OS user of the agent process each descendant alert descends from, so a descendant that
 * runs as another user (`sudo` as root) still resolves to the agent that spawned it.
 *
 * Runs one search per enrichment batch over the endpoint process events, matching every ancestor
 * ID of every descendant alert against agent processes (`process.ai_agent.is_descendant: false`).
 * Returns a map from ancestor process entity ID to its `user.name`. Returns an empty map when there
 * are no descendants or the search fails, so callers fall back to the alert's own `user.name`.
 */
export const fetchAiAgentAncestorUserNames = async <T extends DetectionAlertLatest>({
  esClient,
  events,
  logger,
}: {
  esClient: ElasticsearchClient;
  events: Array<EventsForEnrichment<T>>;
  logger: IRuleExecutionLogForExecutors;
}): Promise<ReadonlyMap<string, string>> => {
  const descendants = events.filter(isAiAgentDescendant);
  const ancestorIds = [...new Set(descendants.flatMap(getAncestorEntityIds))].slice(
    0,
    MAX_ANCESTOR_IDS
  );
  if (ancestorIds.length === 0) {
    return new Map();
  }

  const eventTimes = descendants.map(getEventTimeMs).filter(Number.isFinite);
  const latest = eventTimes.length > 0 ? eventTimes.reduce((a, b) => Math.max(a, b)) : Date.now();
  const earliest = eventTimes.length > 0 ? eventTimes.reduce((a, b) => Math.min(a, b)) : latest;

  try {
    const response = await esClient.search({
      index: AI_AGENT_PROCESS_EVENTS_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: ancestorIds.length,
      track_total_hits: false,
      _source: ['process.entity_id', 'user.name'],
      collapse: { field: 'process.entity_id' },
      query: {
        bool: {
          filter: [
            { terms: { 'process.entity_id': ancestorIds } },
            { term: { 'process.ai_agent.is_descendant': false } },
            { exists: { field: 'user.name' } },
            {
              range: {
                '@timestamp': {
                  gte: new Date(earliest - ANCESTOR_LOOKBACK_MS).toISOString(),
                  lte: new Date(latest).toISOString(),
                },
              },
            },
          ],
        },
      },
    });

    return response.hits.hits.reduce((userNames, { _source: source }) => {
      const entityId: unknown =
        get(source, 'process.entity_id') ?? get(source, ['process.entity_id']);
      const userName: unknown = get(source, 'user.name') ?? get(source, ['user.name']);
      if (typeof entityId === 'string' && typeof userName === 'string') {
        userNames.set(entityId, userName);
      }
      return userNames;
    }, new Map<string, string>());
  } catch (error) {
    logger.debug(`AI agent ancestry lookup failed, using each alert's own user.name: ${error}`);
    return new Map();
  }
};

/** The `user.name` of the nearest agent ancestor of a descendant alert, if the lookup found one. */
export const getAiAgentAncestorUserName = <T extends DetectionAlertLatest>(
  event: EventsForEnrichment<T>,
  ancestorUserNames: ReadonlyMap<string, string>
): string | undefined => {
  if (!isAiAgentDescendant(event)) {
    return undefined;
  }
  return getAncestorEntityIds(event)
    .map((entityId) => ancestorUserNames.get(entityId))
    .find((userName) => userName !== undefined);
};
