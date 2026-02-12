/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import { singleSearchAfter } from './single_search_after';
import { filterEventsAgainstList } from './large_list_filters/filter_events_against_list';
import { sendAlertTelemetryEvents } from './send_telemetry_events';
import { buildEventsSearchQuery } from './build_events_query';
import {
  createSearchAfterReturnType,
  createSearchAfterReturnTypeFromResponse,
  getTotalHitsValue,
  mergeReturns,
  getSafeSortIds,
} from './utils';
import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  SignalSourceHit,
  LoggedRequestsConfig,
} from '../types';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { GenericBulkCreateResponse } from '../factories';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';

import type { DetectionAlertLatest } from '../../../../../common/api/detection_engine/model/alerts';
import * as i18n from '../translations';

const createLoggedRequestsConfig = (
  isLoggedRequestsEnabled: boolean | undefined,
  sortIds: estypes.SortResults | undefined,
  page: number
): LoggedRequestsConfig | undefined => {
  if (!isLoggedRequestsEnabled) {
    return undefined;
  }
  const description = sortIds
    ? i18n.FIND_EVENTS_AFTER_CURSOR_DESCRIPTION(JSON.stringify(sortIds))
    : i18n.FIND_EVENTS_DESCRIPTION;

  return {
    type: 'findDocuments',
    description,
    skipRequestQuery: page > 2, // skipping query logging for performance reasons, so we won't overwhelm Kibana with large response size
  };
};

export interface SearchAfterAndBulkCreateFactoryParams extends SearchAfterAndBulkCreateParams {
  bulkCreateExecutor: (params: {
    enrichedEvents: SignalSourceHit[];
    toReturn: SearchAfterAndBulkCreateReturnType;
  }) => Promise<GenericBulkCreateResponse<DetectionAlertLatest>>;
  getWarningMessage: () => string;
}

export const searchAfterAndBulkCreateFactory = async ({
  sharedParams,
  enrichment = identity,
  eventsTelemetry,
  filter,
  services,
  sortOrder,
  trackTotalHits,
  additionalFilters,
  bulkCreateExecutor,
  getWarningMessage,
  isLoggedRequestsEnabled,
  maxSignalsOverride,
}: SearchAfterAndBulkCreateFactoryParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  const {
    inputIndex: inputIndexPattern,
    runtimeMappings,
    searchAfterSize: pageSize,
    primaryTimestamp,
    secondaryTimestamp,
    unprocessedExceptions: exceptionsList,
    tuple,
    ruleExecutionLogger,
    listClient,
  } = sharedParams;

  return withSecuritySpan('searchAfterAndBulkCreate', async () => {
    let toReturn = createSearchAfterReturnType();
    let searchingIteration = 0;
    const loggedRequests: RulePreviewLoggedRequest[] = [];

    // sortId tells us where to start our next consecutive search_after query
    let sortIds: estypes.SortResults | undefined;

    const maxSignals = maxSignalsOverride ?? tuple.maxSignals;

    while (toReturn.createdSignalsCount <= maxSignals) {
      const cycleNum = `cycle ${searchingIteration++}`;
      try {
        ruleExecutionLogger.debug(
          `[${cycleNum}] Searching events${
            sortIds ? ` after cursor ${JSON.stringify(sortIds)}` : ''
          } in index pattern "${inputIndexPattern}"`
        );

        const searchAfterQuery = buildEventsSearchQuery({
          aggregations: undefined,
          index: inputIndexPattern,
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          runtimeMappings,
          filter,
          size: Math.ceil(Math.min(maxSignals, pageSize)),
          sortOrder,
          searchAfterSortIds: sortIds,
          primaryTimestamp,
          secondaryTimestamp,
          trackTotalHits,
          additionalFilters,
        });
        const {
          searchResult,
          searchDuration,
          searchErrors,
          loggedRequests: singleSearchLoggedRequests = [],
        } = await singleSearchAfter({
          searchRequest: searchAfterQuery,
          services,
          ruleExecutionLogger,
          loggedRequestsConfig: createLoggedRequestsConfig(
            isLoggedRequestsEnabled,
            sortIds,
            searchingIteration
          ),
        });
        toReturn = mergeReturns([
          toReturn,
          createSearchAfterReturnTypeFromResponse({
            searchResult,
            primaryTimestamp,
          }),
          createSearchAfterReturnType({
            searchAfterTimes: [searchDuration],
            errors: searchErrors,
          }),
        ]);
        loggedRequests.push(...singleSearchLoggedRequests);
        // determine if there are any candidate signals to be processed
        const totalHits = getTotalHitsValue(searchResult.hits.total);
        const lastSortIds = getSafeSortIds(
          searchResult.hits.hits[searchResult.hits.hits.length - 1]?.sort
        );

        if (totalHits === 0 || searchResult.hits.hits.length === 0) {
          ruleExecutionLogger.debug(
            `[${cycleNum}] Found 0 events ${
              sortIds ? ` after cursor ${JSON.stringify(sortIds)}` : ''
            }`
          );
          break;
        } else {
          ruleExecutionLogger.debug(
            `[${cycleNum}] Found ${searchResult.hits.hits.length} of total ${totalHits} events${
              sortIds ? ` after cursor ${JSON.stringify(sortIds)}` : ''
            }, last cursor ${JSON.stringify(lastSortIds)}`
          );
        }

        // filter out the search results that match with the values found in the list.
        // the resulting set are signals to be indexed, given they are not duplicates
        // of signals already present in the signals index.
        const [includedEvents, _] = await filterEventsAgainstList({
          listClient,
          exceptionsList,
          ruleExecutionLogger,
          events: searchResult.hits.hits,
        });

        // only bulk create if there are filteredEvents leftover
        // if there isn't anything after going through the value list filter
        // skip the call to bulk create and proceed to the next search_after,
        // if there is a sort id to continue the search_after with.
        if (includedEvents.length !== 0) {
          const enrichedEvents = await enrichment(includedEvents);
          const bulkCreateResult = await bulkCreateExecutor({
            enrichedEvents,
            toReturn,
          });

          ruleExecutionLogger.debug(
            `[${cycleNum}] Created ${bulkCreateResult.createdItemsCount} alerts from ${enrichedEvents.length} events`
          );

          sendAlertTelemetryEvents(
            enrichedEvents,
            bulkCreateResult.createdItems,
            eventsTelemetry,
            ruleExecutionLogger
          );

          if (bulkCreateResult.alertsWereTruncated) {
            toReturn.warningMessages.push(getWarningMessage());
            break;
          }
        }

        // ES can return negative sort id for date field, when sort order set to desc
        // this could happen when event has empty sort field
        // https://github.com/elastic/kibana/issues/174573 (happens to IM rule only since it uses desc order for events search)
        // when negative sort id used in subsequent request it fails, so when negative sort value found we don't do next request
        const hasNegativeNumber = lastSortIds?.some((val) => Number(val) < 0);
        if (lastSortIds != null && lastSortIds.length !== 0 && !hasNegativeNumber) {
          sortIds = lastSortIds;
        } else {
          ruleExecutionLogger.debug(`[${cycleNum}] Unable to fetch last event cursor`);
          break;
        }
      } catch (exc: unknown) {
        ruleExecutionLogger.error(
          'Unable to extract/process events or create alerts',
          JSON.stringify(exc)
        );
        return mergeReturns([
          toReturn,
          createSearchAfterReturnType({
            success: false,
            errors: [`${exc}`],
          }),
        ]);
      }
    }
    ruleExecutionLogger.debug(`Completed bulk indexing of ${toReturn.createdSignalsCount} alert`);

    if (isLoggedRequestsEnabled) {
      toReturn.loggedRequests = loggedRequests;
    }

    return toReturn;
  });
};
