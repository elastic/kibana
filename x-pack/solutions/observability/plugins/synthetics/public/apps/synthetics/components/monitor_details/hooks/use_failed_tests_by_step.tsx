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
import { createEsQuery } from '../../../../../../common/utils/es_search';
import { Ping } from '../../../../../../common/runtime_types';
import { STEP_END_FILTER } from '../../../../../../common/constants/data_filters';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useSyntheticsRefreshContext } from '../../../contexts';

export function useFailedTestByStep({ to, from }: { to: string; from: string }) {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();

  const selectedLocation = useSelectedLocation();

  const params = createEsQuery({
    index: SYNTHETICS_INDEX_PATTERN,
    body: {
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
                'observer.geo.name': selectedLocation?.label,
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
    },
  });

  const { data, loading } = useReduxEsSearch<Ping, typeof params>(
    params,
    [lastRefresh, monitorId],
    {
      name: `getFailedTestsByStep/${monitorId}`,
      isRequestReady: !!selectedLocation,
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
        percent: (count / total) * 100,
      };
    });

    return {
      failedSteps,
      loading,
    };
  }, [data, loading]);
}
