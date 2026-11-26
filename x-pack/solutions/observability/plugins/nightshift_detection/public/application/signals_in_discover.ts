/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { DETECTION_SIGNAL_SOURCE } from '../../common/constants';

const MINUTE_MS = 60_000;

/**
 * The ES|QL commands that read the engine's signals of a space, newest first. `data` is
 * `flattened`, so ES|QL can't filter on the strategy or the bucket inside it; it is kept whole.
 */
export function getSignalsEsqlCommands(spaceId: string): string[] {
  return [
    `FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _id`,
    `WHERE type == "signal" AND source == ${JSON.stringify(
      DETECTION_SIGNAL_SOURCE
    )} AND space_id == ${JSON.stringify(spaceId)}`,
    'KEEP _id, @timestamp, status, severity, group_hash, data',
    'SORT @timestamp DESC',
  ];
}

/** Discover links for the inspector. */
export interface DiscoverLinks {
  /** The space's signals over a time range. */
  getSignalsHref: (timeRange: TimeRange) => string;
  /** Any ES|QL query, such as a signal's evidence query, over a time range. */
  getEsqlHref: (params: { esql: string; timeRange: TimeRange }) => string;
}

/** Builds the inspector's Discover links, or `undefined` when Discover can't be linked to. */
export function createDiscoverLinks({
  share,
  spaceId,
}: {
  share?: SharePluginStart;
  spaceId: string;
}): DiscoverLinks | undefined {
  const locator = share?.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  if (!locator) {
    return undefined;
  }

  const getEsqlHref: DiscoverLinks['getEsqlHref'] = ({ esql, timeRange }) =>
    locator.getRedirectUrl({ query: { esql }, timeRange });
  const signalsEsql = getSignalsEsqlCommands(spaceId).join('\n| ');

  return {
    getEsqlHref,
    getSignalsHref: (timeRange) => getEsqlHref({ esql: signalsEsql, timeRange }),
  };
}

/**
 * The minutes a tick could have stamped its signals with: a signal's `@timestamp` is the minute
 * its tick started on the server, which falls between the call's start and end. The range uses
 * the browser's clock, so a browser clock off from the server's can miss a tick that started
 * near a minute boundary; the header link still finds its signals.
 */
export function getTickTimeRange({
  startedAt,
  durationMs,
}: {
  startedAt: string;
  durationMs: number;
}): TimeRange {
  const start = Date.parse(startedAt);
  const firstMinute = Math.floor(start / MINUTE_MS) * MINUTE_MS;
  const lastMinute = Math.floor((start + durationMs) / MINUTE_MS) * MINUTE_MS;

  return {
    from: new Date(firstMinute).toISOString(),
    // Up to the last minute itself, not the next one, whose signals belong to a later tick.
    to: new Date(lastMinute).toISOString(),
  };
}
