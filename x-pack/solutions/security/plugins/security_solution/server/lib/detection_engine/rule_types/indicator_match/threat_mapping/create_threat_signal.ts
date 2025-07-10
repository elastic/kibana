/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';
import { buildThreatMappingFilter } from './build_threat_mapping_filter';
import { getFilter } from '../../utils/get_filter';
import { searchAfterAndBulkCreate } from '../../utils/search_after_bulk_create';
import { buildReasonMessageForThreatMatchAlert } from '../../utils/reason_formatters';
import type { CreateThreatSignalOptions } from './types';
import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
} from '../../types';
import { searchAfterAndBulkCreateSuppressedAlerts } from '../../utils/search_after_bulk_create_suppressed_alerts';

import { buildThreatEnrichment } from './build_threat_enrichment';
import { alertSuppressionTypeGuard } from '../../utils/get_is_alert_suppression_active';
export const createThreatSignal = async ({
  sharedParams,
  currentResult,
  currentThreatList,
  eventsTelemetry,
  filters,
  services,
  wrapSuppressedHits,
  threatFilters,
  threatPitId,
  allowedFieldsForTermsQuery,
  inputIndexFields,
  threatIndexFields,
  sortOrder = 'desc',
  isAlertSuppressionActive,
}: CreateThreatSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const {
    exceptionFilter,
    inputIndex,
    ruleExecutionLogger,
    completeRule: {
      ruleParams: { language, query, savedId, threatMapping, type },
    },
  } = sharedParams;
  const threatIndicatorPath =
    sharedParams.completeRule.ruleParams.threatIndicatorPath ?? DEFAULT_INDICATOR_SOURCE_PATH;
  const threatFilter = buildThreatMappingFilter({
    threatMapping,
    threatList: currentThreatList,
    entryKey: 'value',
    allowedFieldsForTermsQuery,
  });

  if (!threatFilter.query || threatFilter.query?.bool.should.length === 0) {
    // empty threat list and we do not want to return everything as being
    // a hit so opt to return the existing result.
    ruleExecutionLogger.debug(
      'Indicator items are empty after filtering for missing data, returning without attempting a match'
    );
    return currentResult;
  } else {
    const esFilter = await getFilter({
      type,
      filters: [...filters, threatFilter],
      language,
      query,
      savedId,
      services,
      index: inputIndex,
      exceptionFilter,
      fields: inputIndexFields,
      loadFields: true,
    });

    ruleExecutionLogger.debug(
      `${threatFilter.query?.bool.should.length} indicator items are being checked for existence of matches`
    );

    const threatEnrichment = buildThreatEnrichment({
      sharedParams,
      services,
      threatFilters,
      threatIndicatorPath,
      pitId: threatPitId,
      threatIndexFields,
      allowedFieldsForTermsQuery,
    });

    let result: SearchAfterAndBulkCreateReturnType;
    const searchAfterBulkCreateParams: SearchAfterAndBulkCreateParams = {
      sharedParams,
      buildReasonMessage: buildReasonMessageForThreatMatchAlert,
      enrichment: threatEnrichment,
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
      result = await searchAfterAndBulkCreateSuppressedAlerts({
        ...searchAfterBulkCreateParams,
        wrapSuppressedHits,
        alertSuppression: sharedParams.completeRule.ruleParams.alertSuppression,
      });
    } else {
      result = await searchAfterAndBulkCreate(searchAfterBulkCreateParams);
    }

    ruleExecutionLogger.debug(
      `${
        threatFilter.query?.bool.should.length
      } items have completed match checks and the total times to search were ${
        result.searchAfterTimes.length !== 0 ? result.searchAfterTimes : '(unknown) '
      }ms`
    );
    return result;
  }
};
