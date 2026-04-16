/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

import dateMath from '@kbn/datemath';
import { buildEsQuery } from '@kbn/es-query';

import { useKibana } from '../../../../../../common/lib/kibana';
import { ALERTS_QUERY_NAMES } from '../../../../../../detections/containers/detection_engine/alerts/constants';
import { useQueryAlerts } from '../../../../../../detections/containers/detection_engine/alerts/use_query';
import { useSignalIndex } from '../../../../../../detections/containers/detection_engine/alerts/use_signal_index';
import type { AlertsSelectionSettings } from '../../../types';

const DEBOUNCE_MS = 300;

interface UseMatchedAlertsCountParams {
  esqlQuery?: string;
  settings: AlertsSelectionSettings;
  skip?: boolean;
}

interface UseMatchedAlertsCountResult {
  count: number | null;
  loading: boolean;
}

const buildCountQuery = ({ settings }: { settings: AlertsSelectionSettings }): object | null => {
  try {
    const baseQuery = buildEsQuery(undefined, settings.query, settings.filters);

    return {
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          ...baseQuery.bool,
          filter: [
            ...(Array.isArray(baseQuery.bool?.filter) ? baseQuery.bool.filter : []),
            {
              range: {
                '@timestamp': {
                  gte: settings.start,
                  lte: settings.end,
                },
              },
            },
            {
              terms: {
                'kibana.alert.workflow_status': ['open', 'acknowledged'],
              },
            },
          ],
          must_not: [
            ...(Array.isArray(baseQuery.bool?.must_not) ? baseQuery.bool.must_not : []),
            {
              exists: {
                field: 'kibana.alert.building_block_type',
              },
            },
          ],
        },
      },
    };
  } catch {
    return null;
  }
};

const HAS_START_END_PARAMS = /\?_tstart|\?_tend/i;

const getTimeNamedParams = (
  query: string,
  start: string,
  end: string
): Array<Record<string, string>> => {
  const startTs = /\?_tstart/i.test(query) ? dateMath.parse(start)?.toISOString() : undefined;
  const endTs = /\?_tend/i.test(query)
    ? dateMath.parse(end, { roundUp: true })?.toISOString()
    : undefined;

  return [
    ...(startTs != null ? [{ _tstart: startTs }] : []),
    ...(endTs != null ? [{ _tend: endTs }] : []),
  ];
};

export const useMatchedAlertsCount = ({
  esqlQuery,
  settings,
  skip = false,
}: UseMatchedAlertsCountParams): UseMatchedAlertsCountResult => {
  const { data } = useKibana().services;
  const { signalIndexName } = useSignalIndex();

  const [debouncedSettings, setDebouncedSettings] = useState(settings);

  useDebounce(
    () => {
      setDebouncedSettings(settings);
    },
    DEBOUNCE_MS,
    [settings]
  );

  const isDslMode = esqlQuery == null;

  // --- DSL count (custom query mode) ---
  // Always build the count query regardless of mode so that useQueryAlerts
  // initializes its internal useState with a valid query object. useQueryAlerts
  // only captures the query on first mount via useState(initialQuery), so if
  // the hook first mounts in ES|QL mode with an empty object, switching to
  // custom query mode later would leave the internal state stale ({}).
  const countQuery = useMemo(
    () => buildCountQuery({ settings: debouncedSettings }),
    [debouncedSettings]
  );

  const shouldSkipDsl = skip || !isDslMode || countQuery == null;

  const {
    data: dslData,
    loading: dslLoading,
    setQuery: setDslQuery,
  } = useQueryAlerts({
    query: countQuery ?? {},
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.COUNT,
    skip: shouldSkipDsl,
  });

  // Keep the useQueryAlerts internal query state in sync when countQuery
  // changes (e.g. when debouncedSettings update), because useQueryAlerts
  // only reads the initial prop value via useState(initialQuery).
  useEffect(() => {
    if (countQuery != null) {
      setDslQuery(countQuery);
    }
  }, [countQuery, setDslQuery]);

  const dslCount = useMemo(() => {
    if (shouldSkipDsl || dslData == null) {
      // eslint-disable-next-line no-console
      console.log('[kibana-dkv] useMatchedAlertsCount DSL: skipped or no data', {
        shouldSkipDsl,
        hasDslData: dslData != null,
        'settings.size': settings.size,
        'debouncedSettings.size': debouncedSettings.size,
      });
      return null;
    }

    const totalHits =
      typeof dslData.hits.total === 'number'
        ? dslData.hits.total
        : dslData.hits.total?.value ?? null;

    if (totalHits == null) {
      return null;
    }

    const capped = Math.min(totalHits, settings.size);
    // eslint-disable-next-line no-console
    console.log('[kibana-dkv] useMatchedAlertsCount DSL count:', {
      totalHits,
      'settings.size': settings.size,
      'debouncedSettings.size': debouncedSettings.size,
      capped,
    });
    return capped;
  }, [debouncedSettings.size, dslData, settings.size, shouldSkipDsl]);

  // --- ES|QL count ---
  const [esqlCount, setEsqlCount] = useState<number | null>(null);
  const [esqlLoading, setEsqlLoading] = useState(false);

  const shouldSkipEsql = skip || isDslMode || esqlQuery == null || esqlQuery.trim().length === 0;

  useEffect(() => {
    if (shouldSkipEsql) {
      setEsqlCount(null);
      return;
    }

    const abortController = new AbortController();
    setEsqlLoading(true);

    const esqlCountQuery = `${esqlQuery.trimEnd()}\n| STATS total_count = count()`;
    const namedParams = HAS_START_END_PARAMS.test(esqlCountQuery)
      ? getTimeNamedParams(esqlCountQuery, settings.start, settings.end)
      : [];

    const subscription = data.search
      .search(
        {
          params: {
            query: esqlCountQuery,
            ...(namedParams.length > 0 ? { params: namedParams } : {}),
          },
        },
        {
          abortSignal: abortController.signal,
          strategy: 'esql_async',
        }
      )
      .subscribe({
        next: (response: { rawResponse: unknown }) => {
          const rawResponse = response.rawResponse as { values?: unknown[][] };
          const total = rawResponse.values?.[0]?.[0];
          const count = typeof total === 'number' ? total : null;
          // eslint-disable-next-line no-console
          console.log('[kibana-dkv] useMatchedAlertsCount ES|QL count:', { count, esqlCountQuery });
          setEsqlCount(count);
          setEsqlLoading(false);
        },
        error: (err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[kibana-dkv] useMatchedAlertsCount ES|QL error:', err);
          setEsqlCount(null);
          setEsqlLoading(false);
        },
      });

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  }, [data.search, esqlQuery, settings.end, settings.start, shouldSkipEsql]);

  if (isDslMode) {
    return { count: dslCount, loading: dslLoading };
  }

  return { count: esqlCount, loading: esqlLoading };
};
