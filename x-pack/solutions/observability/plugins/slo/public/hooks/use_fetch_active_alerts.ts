/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
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
    sloId: {
      buckets: Array<{
        key: string;
        doc_count: number;
        instanceId: {
          buckets: Array<{
            key: string;
            doc_count: number;
          }>;
        };
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
              sloId: {
                terms: {
                  size: 100,
                  field: 'slo.id',
                },
                aggs: {
                  instanceId: {
                    terms: {
                      size: 100,
                      field: 'slo.instanceId',
                    },
                  },
                },
              },
            },
          }),
          signal,
        });

        const entries: Array<[{ id: string; instanceId: string }, number]> = [];
        for (const sloIdBucket of response.aggregations.sloId.buckets) {
          entries.push([{ id: sloIdBucket.key, instanceId: ALL_VALUE }, sloIdBucket.doc_count]);
          for (const instanceIdBucket of sloIdBucket.instanceId.buckets) {
            if (instanceIdBucket.key !== ALL_VALUE) {
              entries.push([
                { id: sloIdBucket.key, instanceId: instanceIdBucket.key },
                instanceIdBucket.doc_count,
              ]);
            }
          }
        }
        return new ActiveAlerts(entries);
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
