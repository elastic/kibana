/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewFieldBase } from '@kbn/es-query';

import { ThreatMatchQueryType } from './types';
import type {
  GetThreatListOptions,
  ThreatMatchNamedQuery,
  ThreatTermNamedQuery,
  ThreatListItem,
  AllowedFieldsForTermsQuery,
  EventItem,
} from './types';
import { getThreatList } from './get_threat_list';
import {
  decodeThreatMatchNamedQuery,
  getFieldAndValueToDocIdsMap,
  getMatchedFields,
} from './utils';

import { MAX_NUMBER_OF_SIGNAL_MATCHES } from './enrich_signal_threat_matches';
import { buildThreatMappingFilter } from './build_threat_mapping_filter';
import type { SecurityRuleServices, SecuritySharedParams } from '../../types';
import type { ThreatRuleParams } from '../../../rule_schema';

export type SignalIdToMatchedQueriesMap = Map<string, ThreatMatchNamedQuery[]>;

interface GetSignalIdToMatchedQueriesMapOptions {
  allowedFieldsForTermsQuery: AllowedFieldsForTermsQuery;
  services: SecurityRuleServices;
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  signals: EventItem[];
  pitId: string;
  reassignThreatPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
  threatFilters: unknown[];
  threatIndexFields: DataViewFieldBase[];
  threatIndicatorPath: string;
}

const addMatchedQueryToMaps = ({
  signalId,
  threatHit,
  decodedQuery,
  signalIdToMatchedQueriesMap,
  maxThreatsReachedMap,
}: {
  signalId: string;
  threatHit: ThreatListItem;
  decodedQuery: ThreatMatchNamedQuery | ThreatTermNamedQuery;
  signalIdToMatchedQueriesMap: SignalIdToMatchedQueriesMap;
  maxThreatsReachedMap: Map<string, boolean>;
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

/**
 * fetches threats and creates a map that matches each signal with a list of threat queries
 * @param options.fieldAndValueToDocIdsMap - map of signal values from terms query results
 */
export async function getSignalIdToMatchedQueriesMap({
  allowedFieldsForTermsQuery,
  pitId,
  reassignThreatPitId,
  services,
  sharedParams,
  signals,
  threatFilters,
  threatIndexFields,
  threatIndicatorPath,
}: GetSignalIdToMatchedQueriesMapOptions): Promise<{
  signalIdToMatchedQueriesMap: SignalIdToMatchedQueriesMap;
  threatList: ThreatListItem[];
}> {
  let threatList: Awaited<ReturnType<typeof getThreatList>> | undefined;
  const signalIdToMatchedQueriesMap: SignalIdToMatchedQueriesMap = new Map();
  // number of threat matches per signal is limited by MAX_NUMBER_OF_SIGNAL_MATCHES. Once it hits this number, threats stop to be processed for a signal
  const maxThreatsReachedMap = new Map<string, boolean>();

  const threatFiltersFromEvents = buildThreatMappingFilter({
    threatMapping: sharedParams.completeRule.ruleParams.threatMapping,
    threatList: signals,
    entryKey: 'field',
    allowedFieldsForTermsQuery,
  });

  if (!threatFiltersFromEvents.query || threatFiltersFromEvents.query?.bool.should.length === 0) {
    // empty event list and we do not want to return everything as being
    // a hit so opt to return the existing result.
    return { signalIdToMatchedQueriesMap, threatList: [] };
  }

  const threatMatchedFields = getMatchedFields(sharedParams.completeRule.ruleParams.threatMapping);
  const threatSearchParams: Omit<GetThreatListOptions, 'searchAfter'> = {
    sharedParams,
    esClient: services.scopedClusterClient.asCurrentUser,
    threatFilters: [...threatFilters, threatFiltersFromEvents],
    threatListConfig: {
      _source: [...threatMatchedFields.threat, `${threatIndicatorPath}.*`, 'threat.feed.*'],
      fields: undefined,
    },
    pitId,
    reassignPitId: reassignThreatPitId,
    indexFields: threatIndexFields,
  };

  const fieldAndValueToDocIdsMap = getFieldAndValueToDocIdsMap({
    eventList: signals,
    threatMatchedFields,
  });

  threatList = await getThreatList({ ...threatSearchParams, searchAfter: undefined });
  const threatListPage1 = threatList.hits.hits;

  while (maxThreatsReachedMap.size < signals.length && threatList?.hits.hits.length > 0) {
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
            if (value && fieldAndValueToDocIdsMap) {
              const ids = fieldAndValueToDocIdsMap[decodedQuery.field][value?.toString()];

              ids?.forEach((id: string) => {
                addMatchedQueryToMaps({
                  signalId: id,
                  threatHit,
                  decodedQuery,
                  signalIdToMatchedQueriesMap,
                  maxThreatsReachedMap,
                });
              });
            }
          });
        } else {
          if (!signalId) {
            return;
          }

          addMatchedQueryToMaps({
            signalId,
            threatHit,
            decodedQuery,
            signalIdToMatchedQueriesMap,
            maxThreatsReachedMap,
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
