/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';

import {
  AlertConsumers,
  SLO_RULE_TYPE_IDS,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { ALL_VALUE } from '@kbn/slo-schema/src/schema/common';
import { useKibana } from './use_kibana';
import { sloKeys } from './query_key_factory';
import { ActiveAlerts } from './active_alerts';
import { SLO_LONG_REFETCH_INTERVAL } from '../constants';

type SloIdAndInstanceId = [string, string];

interface Params {
  sloIdsAndInstanceIds: SloIdAndInstanceId[];
  shouldRefetch?: boolean;
  rangeFrom?: string;
}

export interface UseFetchActiveAlerts {
  data: ActiveAlerts;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface FindApiResponse {
  aggregations: {
    perSloId: {
      buckets: Array<{
        key: SloIdAndInstanceId;
        key_as_string: string;
        doc_count: number;
      }>;
    };
  };
}

const EMPTY_ACTIVE_ALERTS_MAP = new ActiveAlerts();

export function useFetchActiveAlerts({
  sloIdsAndInstanceIds = [],
  shouldRefetch = false,
  rangeFrom = 'now-5m/m',
}: Params): UseFetchActiveAlerts {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.activeAlert(sloIdsAndInstanceIds),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.post<FindApiResponse>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
          body: JSON.stringify({
            rule_type_ids: SLO_RULE_TYPE_IDS,
            consumers: [AlertConsumers.SLO, AlertConsumers.OBSERVABILITY, AlertConsumers.ALERTS],
            size: 0,
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: rangeFrom,
                      },
                    },
                  },
                  {
                    term: {
                      'kibana.alert.status': 'active',
                    },
                  },
                ],
                should: sloIdsAndInstanceIds.map(([sloId, instanceId]) => ({
                  bool: {
                    filter: [
                      { term: { 'slo.id': sloId } },
                      ...(instanceId === ALL_VALUE
                        ? []
                        : [{ term: { 'slo.instanceId': instanceId } }]),
                    ],
                  },
                })),
                minimum_should_match: 1,
              },
            },
            aggs: {
              perSloId: {
                multi_terms: {
                  size: 10000,
                  terms: [{ field: 'slo.id' }, { field: 'slo.instanceId' }],
                },
              },
            },
          }),
          signal,
        });

        const activeAlertsData = response.aggregations.perSloId.buckets.reduce((acc, bucket) => {
          return { ...acc, [bucket.key_as_string]: bucket.doc_count ?? 0 };
        }, {} as Record<string, number>);
        return new ActiveAlerts(activeAlertsData);
      } catch (error) {
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
    refetchInterval: shouldRefetch ? SLO_LONG_REFETCH_INTERVAL : undefined,
    enabled: Boolean(sloIdsAndInstanceIds.length),
  });

  return {
    data: isInitialLoading ? EMPTY_ACTIVE_ALERTS_MAP : data ?? EMPTY_ACTIVE_ALERTS_MAP,
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
