/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState } from 'react';
import { debounce } from 'lodash';
import { ALL_VALUE, QuerySchema } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { getElasticsearchQueryOrThrow } from '../../common/parse_kuery';
import { useKibana } from './use_kibana';

export interface UseFetchGroupByCardinalityResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data?: { cardinality: number; isHighCardinality: boolean };
}

const HIGH_CARDINALITY_THRESHOLD = 1000;

const buildInstanceId = (groupBy: string | string[]): string => {
  const groups = [groupBy].flat().filter((value) => !!value);
  const groupings = groups.map((group) => `'${group}:'+doc['${group}'].value`).join(`+'|'+`);

  const hasAllGroupings = groups.map((group) => `doc['${group}'].size() > 0`).join(' && ');
  return `if (${hasAllGroupings}) { emit(${groupings}) }`;
};

export function useFetchGroupByCardinality(
  indexPattern: string,
  timestampField: string = '@timestamp',
  groupBy: string | string[],
  filters?: QuerySchema
): UseFetchGroupByCardinalityResponse {
  const { data: dataService } = useKibana().services;

  const serializedFilters = JSON.stringify(filters);
  const [filtersState, setFiltersState] = useState<string>(serializedFilters);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useCallback(
    debounce((value: string) => setFiltersState(value), 800),
    []
  );

  useEffect(() => {
    if (filtersState !== serializedFilters) {
      store(serializedFilters);
    }
  }, [filtersState, serializedFilters, store]);

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['fetchGroupByCardinality', indexPattern, timestampField, groupBy, filters],
    queryFn: async ({ signal }) => {
      try {
        const result = await lastValueFrom(
          dataService.search.search({
            params: {
              index: indexPattern,
              body: {
                query: {
                  bool: {
                    filter: [
                      { range: { [timestampField]: { gte: 'now-24h' } } },
                      getElasticsearchQueryOrThrow(filters),
                    ],
                  },
                },
                runtime_mappings: {
                  group_combinations: {
                    type: 'keyword',
                    script: buildInstanceId(groupBy),
                  },
                },
                aggs: {
                  groupByCardinality: {
                    cardinality: {
                      field: 'group_combinations',
                    },
                  },
                },
              },
            },
          })
        );

        // @ts-expect-error Property 'value' does not exist on type 'AggregationsAggregate'
        const cardinality = result.rawResponse?.aggregations?.groupByCardinality?.value ?? 0;
        return { cardinality, isHighCardinality: cardinality > HIGH_CARDINALITY_THRESHOLD };
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled:
      Boolean(indexPattern) &&
      Boolean(timestampField) &&
      Boolean(groupBy) &&
      ![groupBy].flat().includes(ALL_VALUE),
  });

  return { isLoading, isError, isSuccess, data };
}
