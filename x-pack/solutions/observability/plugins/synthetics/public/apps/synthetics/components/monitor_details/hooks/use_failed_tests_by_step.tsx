/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';
import { useSelectedLocation } from './use_selected_location';
import { useSelectedMonitor } from './use_selected_monitor';
import { useMonitorLatestPing } from './use_monitor_latest_ping';
import { createEsQuery } from '../../../../../../common/utils/es_search';
import type { Ping } from '../../../../../../common/runtime_types';
import { STEP_END_FILTER } from '../../../../../../common/constants/data_filters';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';

export function useFailedTestByStep({ to, from }: { to: string; from: string }) {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();
  const { remoteName } = useGetUrlParams();

  const { isRemote } = useSelectedMonitor();
  const selectedLocation = useSelectedLocation();
  const { latestPing } = useMonitorLatestPing();

  // Remote monitors are not in the local locations list, so fall back to the
  // latest ping's `observer.geo.name` for the location filter.
  const resolvedLocationLabel =
    selectedLocation?.label ?? (isRemote ? latestPing?.observer?.geo?.name : undefined);

  const params = createEsQuery({
    // For remote monitors, target the remote cluster's synthetics indices
    // via CCS syntax.
    index: remoteName ? `${remoteName}:${SYNTHETICS_INDEX_PATTERN}` : SYNTHETICS_INDEX_PATTERN,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                lte: to,
                gte: from,
              },
            },
          },
          STEP_END_FILTER,
          {
            term: {
              'synthetics.step.status': 'failed',
            },
          },
          {
            term: {
              'observer.geo.name': resolvedLocationLabel,
            },
          },
          {
            term: {
              config_id: monitorId,
            },
          },
        ],
      },
    },
    aggs: {
      steps: {
        terms: {
          field: 'synthetics.step.name.keyword',
          size: 1000,
        },
        aggs: {
          doc: {
            top_hits: {
              size: 1,
            },
          },
        },
      },
    },
  });

  const { data, loading } = useReduxEsSearch<Ping, typeof params>(
    params,
    [lastRefresh, monitorId, from, to, resolvedLocationLabel, remoteName],
    {
      name: `getFailedTestsByStep/${monitorId}/${from}/${to}`,
      isRequestReady: Boolean(resolvedLocationLabel),
    }
  );

  return useMemo(() => {
    const total = data?.hits.total.value;

    const failedSteps = data?.aggregations?.steps.buckets.map(({ key, doc_count: count, doc }) => {
      const index = doc.hits.hits?.[0]._source?.synthetics?.step?.index;
      return {
        index,
        count,
        name: key,
        // @ts-expect-error upgrade typescript v5.4.5
        percent: (count / total) * 100,
      };
    });

    return {
      failedSteps,
      loading,
    };
  }, [data, loading]);
}
