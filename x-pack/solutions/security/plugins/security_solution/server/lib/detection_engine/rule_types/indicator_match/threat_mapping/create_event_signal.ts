/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';
import { getFilter } from '../../utils/get_filter';
import { searchAfterAndBulkCreate } from '../../utils/search_after_bulk_create';
import { buildReasonMessageForThreatMatchAlert } from '../../utils/reason_formatters';
import type { CreateEventSignalOptions, ThreatListItem } from './types';
import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
} from '../../types';
import { getSignalIdToMatchedQueriesMap } from './get_signal_id_to_matched_queries_map';
import type { SignalIdToMatchedQueriesMap } from './get_signal_id_to_matched_queries_map';
import { searchAfterAndBulkCreateSuppressedAlerts } from '../../utils/search_after_bulk_create_suppressed_alerts';

import { threatEnrichmentFactory } from './threat_enrichment_factory';
import { FAILED_CREATE_QUERY_MAX_CLAUSE, MANY_NESTED_CLAUSES_ERR } from './utils';
import { alertSuppressionTypeGuard } from '../../utils/get_is_alert_suppression_active';
import { validateCompleteThreatMatches } from './validate_complete_threat_matches';

export const createEventSignal = async ({
  sharedParams,
  currentResult,
  currentEventList,
  eventsTelemetry,
  filters,
  services,
  wrapSuppressedHits,
  threatFilters,
  threatPitId,
  reassignThreatPitId,
  allowedFieldsForTermsQuery,
  inputIndexFields,
  threatIndexFields,
  sortOrder = 'desc',
  isAlertSuppressionActive,
}: CreateEventSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const {
    ruleExecutionLogger,
    exceptionFilter,
    inputIndex,
    completeRule: {
      ruleParams: { threatMapping, type, language, query, savedId },
    },
  } = sharedParams;
  const threatIndicatorPath =
    sharedParams.completeRule.ruleParams.threatIndicatorPath ?? DEFAULT_INDICATOR_SOURCE_PATH;

  let signalIdToMatchedQueriesMap: SignalIdToMatchedQueriesMap | undefined;
  let threatList: ThreatListItem[] | undefined;
  try {
    const result = await getSignalIdToMatchedQueriesMap({
      services,
      sharedParams,
      signals: currentEventList,
      allowedFieldsForTermsQuery,
      pitId: threatPitId,
      reassignThreatPitId,
      threatFilters,
      threatIndexFields,
      threatIndicatorPath,
    });
    signalIdToMatchedQueriesMap = result.signalIdToMatchedQueriesMap;
    threatList = result.threatList;
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

  const { matchedEvents, skippedIds } = validateCompleteThreatMatches(
    signalIdToMatchedQueriesMap,
    threatMapping
  );

  if (skippedIds.length > 0) {
    ruleExecutionLogger.debug(`Skipping not matched documents: ${skippedIds.join(', ')}`);
  }

  const ids = Array.from(matchedEvents.keys());
  if (ids.length === 0) {
    return currentResult;
  }
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
    signalIdToMatchedQueriesMap: matchedEvents,
    threatIndicatorPath,
    matchedThreats: threatList,
  });

  let createResult: SearchAfterAndBulkCreateReturnType;
  const searchAfterBulkCreateParams: SearchAfterAndBulkCreateParams = {
    sharedParams,
    buildReasonMessage: buildReasonMessageForThreatMatchAlert,
    enrichment,
    eventsTelemetry,
    filter: esFilter,
    services,
    sortOrder,
    trackTotalHits: false,
  };

  if (
    isAlertSuppressionActive &&
    alertSuppressionTypeGuard(sharedParams.completeRule.ruleParams.alertSuppression)
  ) {
    createResult = await searchAfterAndBulkCreateSuppressedAlerts({
      ...searchAfterBulkCreateParams,
      wrapSuppressedHits,
      alertSuppression: sharedParams.completeRule.ruleParams.alertSuppression,
    });
  } else {
    createResult = await searchAfterAndBulkCreate(searchAfterBulkCreateParams);
  }
  ruleExecutionLogger.debug(
    `${
      currentEventList.length
    } items have completed match checks and the total times to search were ${
      createResult.searchAfterTimes.length !== 0 ? createResult.searchAfterTimes : '(unknown) '
    }ms`
  );
  return createResult;
};
