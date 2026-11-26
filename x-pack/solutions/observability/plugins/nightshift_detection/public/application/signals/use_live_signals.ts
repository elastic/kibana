/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { getSignalsEsqlCommands } from '../signals_in_discover';

/** How often the list reads again while live. */
export const SIGNALS_REFRESH_MS = 20_000;
/** Newest signals the list shows. */
const MAX_SIGNALS = 200;

/**
 * One stored signal as ES|QL returns it. `data` is `flattened`: every leaf comes back a string, and
 * nested keys come back dotted, such as `entity.type`.
 */
export interface StoredSignalRow {
  '@timestamp': string;
  status: string;
  severity: string | null;
  group_hash: string;
  data: Record<string, unknown>;
}

export interface LiveSignals {
  signals: StoredSignalRow[];
  error?: string;
  isLoading: boolean;
  /** When the last read finished, in epoch milliseconds. */
  updatedAt?: number;
  /** Reads again now. */
  refresh: () => void;
}

function toRows({ columns, values }: ESQLSearchResponse): StoredSignalRow[] {
  const names = columns.map(({ name }) => name);
  return values.map(
    (row) =>
      Object.fromEntries(
        names.map((name, index) => [name, row[index]])
      ) as unknown as StoredSignalRow
  );
}

/**
 * The space's newest detection signals, read from `.rule-events` with ES|QL as the current user,
 * again every {@link SIGNALS_REFRESH_MS} while `isLive`. A read that fails keeps the last list.
 */
export function useLiveSignals({
  data,
  spaceId,
  isLive,
}: {
  data: DataPublicPluginStart;
  spaceId: string;
  isLive: boolean;
}): LiveSignals {
  const [signals, setSignals] = useState<StoredSignalRow[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>();
  // Bumped to read again. The effect below owns every read, so a slow read is cancelled, not raced.
  const [readCount, setReadCount] = useState(0);

  const refresh = useCallback(() => setReadCount((count) => count + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const query = [...getSignalsEsqlCommands(spaceId), `LIMIT ${MAX_SIGNALS}`].join('\n| ');

    setIsLoading(true);
    lastValueFrom(
      data.search.search<
        IKibanaSearchRequest<ESQLSearchParams>,
        IKibanaSearchResponse<ESQLSearchResponse>
      >({ params: { query } }, { strategy: ESQL_SEARCH_STRATEGY, abortSignal: controller.signal })
    )
      .then(({ rawResponse }) => {
        setSignals(toRows(rawResponse));
        setError(undefined);
        setUpdatedAt(Date.now());
      })
      .catch((readError: unknown) => {
        if (!controller.signal.aborted) {
          setError(readError instanceof Error ? readError.message : String(readError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [data, spaceId, readCount]);

  useEffect(() => {
    if (!isLive) {
      return;
    }
    const interval = setInterval(refresh, SIGNALS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [isLive, refresh]);

  return { signals, error, isLoading, updatedAt, refresh };
}
