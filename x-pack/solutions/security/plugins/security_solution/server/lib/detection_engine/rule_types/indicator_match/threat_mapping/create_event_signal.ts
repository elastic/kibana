/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildThreatMappingFilter } from './build_threat_mapping_filter';
import { getFilter } from '../../utils/get_filter';
import { searchAfterAndBulkCreate } from '../../utils/search_after_bulk_create';
import { buildReasonMessageForThreatMatchAlert } from '../../utils/reason_formatters';
import type { CreateEventSignalOptions } from './types';
import type { SearchAfterAndBulkCreateReturnType } from '../../types';
import { getSignalsQueryMapFromThreatIndex } from './get_signals_map_from_threat_index';
import { searchAfterAndBulkCreateSuppressedAlerts } from '../../utils/search_after_bulk_create_suppressed_alerts';

import { threatEnrichmentFactory } from './threat_enrichment_factory';
import {
  FAILED_CREATE_QUERY_MAX_CLAUSE,
  getSignalValueMap,
  MANY_NESTED_CLAUSES_ERR,
} from './utils';

export const createEventSignal = async ({
  bulkCreate,
  currentResult,
  currentEventList,
  eventsTelemetry,
  filters,
  inputIndex,
  language,
  listClient,
  query,
  ruleExecutionLogger,
  savedId,
  searchAfterSize,
  services,
  threatMapping,
  tuple,
  type,
  wrapHits,
  wrapSuppressedHits,
  threatQuery,
  threatFilters,
  threatLanguage,
  threatIndex,
  threatIndicatorPath,
  threatPitId,
  reassignThreatPitId,
  runtimeMappings,
  runOpts,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  unprocessedExceptions,
  allowedFieldsForTermsQuery,
  threatMatchedFields,
  inputIndexFields,
  threatIndexFields,
  completeRule,
  sortOrder = 'desc',
  isAlertSuppressionActive,
  experimentalFeatures,
}: CreateEventSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const threatFiltersFromEvents = buildThreatMappingFilter({
    threatMapping,
    threatList: currentEventList,
    entryKey: 'field',
    allowedFieldsForTermsQuery,
  });

  if (!threatFiltersFromEvents.query || threatFiltersFromEvents.query?.bool.should.length === 0) {
    // empty event list and we do not want to return everything as being
    // a hit so opt to return the existing result.
    ruleExecutionLogger.debug(
      'Indicator items are empty after filtering for missing data, returning without attempting a match'
    );
    return currentResult;
  } else {
    const threatSearchParams = {
      esClient: services.scopedClusterClient.asCurrentUser,
      threatFilters: [...threatFilters, threatFiltersFromEvents],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      ruleExecutionLogger,
      threatListConfig: {
        _source: threatMatchedFields.threat,
        fields: undefined,
      },
      pitId: threatPitId,
      reassignPitId: reassignThreatPitId,
      runtimeMappings,
      listClient,
      exceptionFilter,
      indexFields: threatIndexFields,
    };

    let signalsQueryMap;
    try {
      signalsQueryMap = await getSignalsQueryMapFromThreatIndex({
        threatSearchParams,
        eventsCount: currentEventList.length,
        signalValueMap: getSignalValueMap({
          eventList: currentEventList,
          threatMatchedFields,
        }),
        termsQueryAllowed: true,
      });
    } catch (exc) {
      // we receive an error if the event list count < threat list count
      // which puts us into the create_event_signal which differs from create threat signal
      // in that we call getSignalsQueryMapFromThreatIndex which can *throw* an error
      // rather than *return* one.
      if (
        exc.message.includes(MANY_NESTED_CLAUSES_ERR) ||
        exc.message.includes(FAILED_CREATE_QUERY_MAX_CLAUSE)
      ) {
        currentResult.errors.push(exc.message);
        return currentResult;
      } else {
        throw exc;
      }
    }

    const ids = Array.from(signalsQueryMap.keys());
    const indexFilter = {
      query: {
        bool: {
          filter: {
            ids: { values: ids },
          },
        },
      },
    };

    const esFilter = await getFilter({
      type,
      filters: [...filters, indexFilter],
      language,
      query,
      savedId,
      services,
      index: inputIndex,
      exceptionFilter,
      fields: inputIndexFields,
      loadFields: true,
    });

    ruleExecutionLogger.debug(`${ids?.length} matched signals found`);

    const enrichment = threatEnrichmentFactory({
      signalsQueryMap,
      threatIndicatorPath,
      threatFilters,
      threatSearchParams,
    });

    let createResult: SearchAfterAndBulkCreateReturnType;
    const searchAfterBulkCreateParams = {
      buildReasonMessage: buildReasonMessageForThreatMatchAlert,
      bulkCreate,
      enrichment,
      eventsTelemetry,
      exceptionsList: unprocessedExceptions,
      filter: esFilter,
      inputIndexPattern: inputIndex,
      listClient,
      pageSize: searchAfterSize,
      ruleExecutionLogger,
      services,
      sortOrder,
      trackTotalHits: false,
      tuple,
      wrapHits,
      runtimeMappings,
      primaryTimestamp,
      secondaryTimestamp,
    };

    if (isAlertSuppressionActive) {
      createResult = await searchAfterAndBulkCreateSuppressedAlerts({
        ...searchAfterBulkCreateParams,
        wrapSuppressedHits,
        alertTimestampOverride: runOpts.alertTimestampOverride,
        alertWithSuppression: runOpts.alertWithSuppression,
        alertSuppression: completeRule.ruleParams.alertSuppression,
        experimentalFeatures,
      });
    } else {
      createResult = await searchAfterAndBulkCreate(searchAfterBulkCreateParams);
    }
    ruleExecutionLogger.debug(
      `${
        threatFiltersFromEvents.query?.bool.should.length
      } items have completed match checks and the total times to search were ${
        createResult.searchAfterTimes.length !== 0 ? createResult.searchAfterTimes : '(unknown) '
      }ms`
    );
    return createResult;
  }
};
