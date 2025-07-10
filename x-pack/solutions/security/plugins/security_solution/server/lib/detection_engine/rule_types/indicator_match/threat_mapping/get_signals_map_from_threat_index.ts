/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';

import { ThreatMatchQueryType } from './types';
import type {
  GetThreatListOptions,
  ThreatMatchNamedQuery,
  ThreatTermNamedQuery,
  ThreatListItem,
  FieldAndValueToDocIdsMap,
} from './types';
import { getThreatList } from './get_threat_list';
import { decodeThreatMatchNamedQuery } from './utils';

import { MAX_NUMBER_OF_SIGNAL_MATCHES } from './enrich_signal_threat_matches';

export type SignalIdToMatchedQueriesMap = Map<string, ThreatMatchNamedQuery[]>;

interface GetSignalIdToMatchedQueriesMapOptions {
  threatSearchParams: Omit<GetThreatListOptions, 'searchAfter'>;
  eventsCount: number;
  fieldAndValueToDocIdsMap: FieldAndValueToDocIdsMap;
}

/**
 * fetches threats and creates a map that matches each signal with a list of threat queries
 * @param options.fieldAndValueToDocIdsMap - map of signal values from terms query results
 */
export async function getSignalIdToMatchedQueriesMap(
  options: GetSignalIdToMatchedQueriesMapOptions
): Promise<{
  signalIdToMatchedQueriesMap: SignalIdToMatchedQueriesMap;
  threatList: ThreatListItem[];
}> {
  const { threatSearchParams, eventsCount } = options;

  let threatList: Awaited<ReturnType<typeof getThreatList>> | undefined;
  const signalIdToMatchedQueriesMap = new Map<string, ThreatMatchNamedQuery[]>();
  // number of threat matches per signal is limited by MAX_NUMBER_OF_SIGNAL_MATCHES. Once it hits this number, threats stop to be processed for a signal
  const maxThreatsReachedMap = new Map<string, boolean>();

  const addMatchedQueryToMap = ({
    signalId,
    threatHit,
    decodedQuery,
  }: {
    signalId: string;
    threatHit: ThreatListItem;
    decodedQuery: ThreatMatchNamedQuery | ThreatTermNamedQuery;
  }) => {
    const signalMatch = signalIdToMatchedQueriesMap.get(signalId);

    const threatQuery = {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: threatHit._id!,
      index: threatHit._index,
      field: decodedQuery.field,
      value: decodedQuery.value,
      queryType: decodedQuery.queryType,
    };

    if (!signalMatch) {
      signalIdToMatchedQueriesMap.set(signalId, [threatQuery]);
      return;
    }

    if (signalMatch.length === MAX_NUMBER_OF_SIGNAL_MATCHES) {
      maxThreatsReachedMap.set(signalId, true);
    } else if (signalMatch.length < MAX_NUMBER_OF_SIGNAL_MATCHES) {
      signalMatch.push(threatQuery);
    }
  };

  threatList = await getThreatList({ ...threatSearchParams, searchAfter: undefined });
  const threatListPage1 = threatList.hits.hits;

  while (maxThreatsReachedMap.size < eventsCount && threatList?.hits.hits.length > 0) {
    threatList.hits.hits.forEach((threatHit) => {
      const matchedQueries = Array.isArray(threatHit?.matched_queries)
        ? threatHit.matched_queries
        : [];

      matchedQueries.forEach((matchedQuery) => {
        const decodedQuery = decodeThreatMatchNamedQuery(matchedQuery);
        const signalId = decodedQuery.id;

        if (decodedQuery.queryType === ThreatMatchQueryType.term) {
          const threatValue = get(threatHit?._source, decodedQuery.value);
          const values = Array.isArray(threatValue) ? threatValue : [threatValue];

          values.forEach((value) => {
            if (value && options.fieldAndValueToDocIdsMap) {
              const ids = options.fieldAndValueToDocIdsMap[decodedQuery.field][value?.toString()];

              ids?.forEach((id: string) => {
                addMatchedQueryToMap({
                  signalId: id,
                  threatHit,
                  decodedQuery,
                });
              });
            }
          });
        } else {
          if (!signalId) {
            return;
          }

          addMatchedQueryToMap({
            signalId,
            threatHit,
            decodedQuery,
          });
        }
      });
    });

    threatList = await getThreatList({
      ...threatSearchParams,
      searchAfter: threatList.hits.hits[threatList.hits.hits.length - 1].sort,
    });
  }

  return { signalIdToMatchedQueriesMap, threatList: threatListPage1 };
}
