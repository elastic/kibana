/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { estypes } from '@elastic/elasticsearch';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../../common/constants/synthetics_alerts';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useGetUrlParams } from '../../../hooks';
import { useMonitorFilters } from './use_monitor_filters';

const ALERT_STATUS_FIELD = 'kibana.alert.status';

interface Props {
  from: string;
  to: string;
}

export function useOverviewAlertsCount({ from, to }: Props) {
  const { http } = useKibana<ClientPluginsStart>().services;
  const { locations } = useGetUrlParams();
  const alertsFilters = useMonitorFilters({ forAlerts: true });

  const abortCtrlRef = useRef(new AbortController());

  const query: estypes.QueryDslQueryContainer = {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: from, lte: to } } },
        ...alertsFilters.map(
          (filter): estypes.QueryDslQueryContainer => ({
            terms: { [filter.field]: (filter.values ?? []).map(String) },
          })
        ),
        ...(locations?.length
          ? [{ terms: { 'observer.geo.name': locations } } as estypes.QueryDslQueryContainer]
          : []),
      ],
    },
  };

  const [state, refetch] = useAsyncFn(
    () => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      return fetchAlertsCount({ http, query, signal: abortCtrlRef.current.signal });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [http, from, to, JSON.stringify(alertsFilters), JSON.stringify(locations)],
    { loading: true }
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    count: state.value ?? 0,
    loading: Boolean(state.loading),
    error: state.error,
  };
}

async function fetchAlertsCount({
  http,
  query,
  signal,
}: {
  http: HttpSetup;
  query: estypes.QueryDslQueryContainer;
  signal: AbortSignal;
}): Promise<number> {
  const response = await http.post<estypes.SearchResponse<Record<string, unknown>>>(
    `${BASE_RAC_ALERTS_API_PATH}/find`,
    {
      signal,
      body: JSON.stringify({
        aggs: {
          count: {
            terms: { field: ALERT_STATUS_FIELD },
          },
        },
        rule_type_ids: [SYNTHETICS_STATUS_RULE, SYNTHETICS_TLS_RULE],
        query,
        size: 0,
      }),
    }
  );

  const countAggs = response.aggregations?.count as estypes.AggregationsMultiBucketAggregateBase;
  const buckets = (countAggs?.buckets as estypes.AggregationsStringTermsBucketKeys[]) ?? [];

  return buckets.reduce((total, bucket) => {
    if (bucket.key === ALERT_STATUS_ACTIVE || bucket.key === ALERT_STATUS_RECOVERED) {
      return total + bucket.doc_count;
    }
    return total;
  }, 0);
}
