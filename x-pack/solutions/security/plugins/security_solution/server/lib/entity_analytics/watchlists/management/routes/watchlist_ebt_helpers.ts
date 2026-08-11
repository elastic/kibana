/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCHLIST_API_CALL_EVENT } from '../../../../telemetry/event_based/events';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';

const CUSTOM_WATCHLIST_TELEMETRY_NAME = 'custom watchlist';

interface WatchlistRequestBodyForTelemetry {
  name?: string;
  managed?: boolean;
  riskModifier?: number;
}

export const buildWatchlistApiCallSuccessFields = (
  path: string,
  body: WatchlistRequestBodyForTelemetry,
  watchlistId: string,
  /** Omit for update routes; for create, pass counts (use `{ count: 0 }` when there are no sources). */
  entitySources?: { count: number; types?: string[] }
) => {
  return {
    endpoint: path,
    watchlist_id: watchlistId,
    watchlist_name: body.managed ? body.name : CUSTOM_WATCHLIST_TELEMETRY_NAME, // custom watchlists use user input strings, this should remain anonymous
    risk_modifier: body.riskModifier,
    is_managed: body.managed ?? false,
    ...(entitySources !== undefined
      ? {
          entity_source_count: entitySources.count,
          ...(entitySources.types !== undefined && entitySources.types.length > 0
            ? { entity_source_types: entitySources.types }
            : {}),
        }
      : {}),
  };
};

export const reportWatchlistApiCallError = (
  sender: ITelemetryEventsSender,
  { path, errorMessage, watchlistId }: { path: string; errorMessage: string; watchlistId?: string }
) => {
  sender.reportEBT(WATCHLIST_API_CALL_EVENT, {
    endpoint: path,
    error: errorMessage,
    ...(watchlistId !== undefined ? { watchlist_id: watchlistId } : {}),
  });
};
