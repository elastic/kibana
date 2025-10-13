/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { IEsSearchRequest } from '@kbn/search-types';
import { useQuery } from '@kbn/react-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { createFetchData } from '../utils/fetch_data';
import { useKibana } from '../../../../common/lib/kibana';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';

const QUERY_KEY = 'useFetchFieldValuePairWithAggregation';

export const FIELD_NAMES_AGG_KEY = 'fieldNames';
export const EVENT_KIND_AGG_KEY = 'eventKind';
export const HOST_NAME_AGG_KEY = 'hostName';
export const USER_NAME_AGG_KEY = 'userName';
export const HOSTS_AGG_KEY = 'hosts';
export const USERS_AGG_KEY = 'users';

export interface AggregationValue {
  doc_count: number;
  key: string;
}

/**
 * Interface for a specific aggregation schema with nested aggregations, used in the prevalence components
 */
export interface RawAggregatedDataResponse {
  aggregations: {
    [FIELD_NAMES_AGG_KEY]: {
      buckets: {
        [key: string]: {
          eventKind: { buckets: AggregationValue[] };
          hostName: { value: number };
          userName: { value: number };
        };
      };
    };
    [HOSTS_AGG_KEY]: {
      value: number;
    };
    [USERS_AGG_KEY]: {
      value: number;
    };
  };
}

export interface UseFetchPrevalenceParams {
  /**
   * The highlighted field name and values, already formatted for the query
   * */
  highlightedFieldsFilters: Record<string, QueryDslQueryContainer>;
  /**
   * The from and to values for the query
   */
  interval: { from: string; to: string };
}

export interface UseFetchPrevalenceResult {
  /**
   * Returns true if data is being loaded
   */
  loading: boolean;
  /**
   * Returns true if fetching data has errored out
   */
  error: boolean;
  /**
   * Returns the prevalence raw aggregated data
   */
  data: RawAggregatedDataResponse | undefined;
}

/**
 * Hook to fetch prevalence data for both the PrevalenceDetails and PrevalenceOverview components.
 * Here's how we fetch the data:
 * - the query filter is just limiting to the from/to datetime range
 * - we do 3 top level aggregations:
 *     - one for each field/value pairs
 *     - one for all the unique hosts in the environment
 *     - one for all the unique users  in the environment
 * For each field/value pair aggregated, we do 3 sub aggregations:
 *    - one to retrieve the unique hosts which have the field/value pair
 *    - one to retrieve the unique users which have the field/value pair
 *    - one to retrieve how many documents are of the different type of event.kind
 * All of these values are then used to calculate the alert count, document count, host and user prevalence values.
 */
export const useFetchPrevalence = ({
  highlightedFieldsFilters,
  interval: { from, to },
}: UseFetchPrevalenceParams): UseFetchPrevalenceResult => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();

  // retrieves detections and non-detections indices (for example, the alert security index from the current space and 'logs-*' indices)
  const { indexPatterns } = useSecurityDefaultPatterns();

  const searchRequest = buildSearchRequest(highlightedFieldsFilters, from, to, indexPatterns);

  const { data, isLoading, isError } = useQuery(
    [QUERY_KEY, highlightedFieldsFilters, from, to],
    () => createFetchData<RawAggregatedDataResponse>(searchService, searchRequest)
  );

  return {
    loading: isLoading,
    error: isError,
    data,
  };
};

/**
 * Build the search request for the field/values pair, for a date range from/to.
 * The request contains aggregation by aggregationField.
 */
const buildSearchRequest = (
  highlightedFieldsFilters: Record<string, QueryDslQueryContainer>,
  from: string,
  to: string,
  selectedPatterns: string[]
): IEsSearchRequest => {
  const query = buildEsQuery(
    undefined,
    [],
    [
      {
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: from,
                    lte: to,
                  },
                },
              },
            ],
          },
        },
        meta: {},
      },
    ]
  );

  return buildAggregationSearchRequest(query, highlightedFieldsFilters, selectedPatterns);
};

const buildAggregationSearchRequest = (
  query: QueryDslQueryContainer,
  highlightedFieldsFilters: Record<string, QueryDslQueryContainer>,
  selectedPatterns: string[]
): IEsSearchRequest => ({
  params: {
    index: selectedPatterns,
    query,
    aggs: {
      // with this aggregation, we can in a single call retrieve all the values for each field/value pairs
      [FIELD_NAMES_AGG_KEY]: {
        filters: {
          filters: highlightedFieldsFilters,
        },
        aggs: {
          // this sub aggregation allows us to retrieve all the hosts which have the field/value pair
          [HOST_NAME_AGG_KEY]: {
            cardinality: {
              field: 'host.name',
            },
          },
          // this sub aggregation allows us to retrieve all the users which have the field/value pair
          [USER_NAME_AGG_KEY]: {
            cardinality: {
              field: 'user.name',
            },
          },
          // we use this sub aggregation to differentiate between alerts (event.kind === 'signal') and documents (event.kind !== 'signal')
          [EVENT_KIND_AGG_KEY]: {
            terms: {
              field: 'event.kind',
              size: 10, // there should be only 8 different value for the event.kind field
            },
          },
        },
      },
      // retrieve all the unique hosts in the environment
      [HOSTS_AGG_KEY]: {
        cardinality: {
          field: 'host.name',
        },
      },
      // retrieve all the unique users in the environment
      [USERS_AGG_KEY]: {
        cardinality: {
          field: 'user.name',
        },
      },
    },
    size: 0,
  },
});
