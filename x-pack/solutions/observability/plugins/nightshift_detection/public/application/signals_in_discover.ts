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

/** A Discover link to the space's detection signals over a time range. */
export type GetSignalsHref = (timeRange: TimeRange) => string;

/**
 * Builds Discover links to the detection signals of a space. `data` is `flattened`, so ES|QL
 * can't filter on the strategy or the bucket inside it; it is kept whole for reading instead.
 * Returns `undefined` when Discover can't be linked to.
 */
export function createGetSignalsHref({
  share,
  spaceId,
}: {
  share?: SharePluginStart;
  spaceId: string;
}): GetSignalsHref | undefined {
  const locator = share?.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  if (!locator) {
    return undefined;
  }

  const esql = [
    `FROM ${ALERT_EVENTS_DATA_STREAM}`,
    `WHERE type == "signal" AND source == ${JSON.stringify(
      DETECTION_SIGNAL_SOURCE
    )} AND space_id == ${JSON.stringify(spaceId)}`,
    'KEEP @timestamp, status, severity, group_hash, data',
    'SORT @timestamp DESC',
  ].join('\n| ');

  return (timeRange) => locator.getRedirectUrl({ query: { esql }, timeRange });
}

/**
 * The minutes a tick could have stamped its signals with: a signal's `@timestamp` is the minute
 * its tick started on the server, which falls between the call's start and end.
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
