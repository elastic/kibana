/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { Filter } from '@kbn/es-query';
import type { AnomalyResults } from '../../../machine_learning';
import { getAnomalies, buildAnomalyQuery } from '../../../machine_learning';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import { logSearchRequest } from '../utils/logged_requests';
import * as i18n from '../translations';

export const findMlSignals = async ({
  ml,
  request,
  savedObjectsClient,
  jobIds,
  anomalyThreshold,
  from,
  to,
  maxSignals,
  exceptionFilter,
  isLoggedRequestsEnabled,
}: {
  ml: MlPluginSetup;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  jobIds: string[];
  anomalyThreshold: number;
  from: string;
  to: string;
  maxSignals: number;
  exceptionFilter: Filter | undefined;
  isLoggedRequestsEnabled: boolean;
}): Promise<{ anomalyResults: AnomalyResults; loggedRequests?: RulePreviewLoggedRequest[] }> => {
  const loggedRequests: RulePreviewLoggedRequest[] = [];

  const { mlAnomalySearch } = ml.mlSystemProvider(request, savedObjectsClient);
  const params = {
    jobIds,
    threshold: anomalyThreshold,
    earliestMs: dateMath.parse(from)?.valueOf() ?? 0,
    latestMs: dateMath.parse(to)?.valueOf() ?? 0,
    maxRecords: maxSignals,
    exceptionFilter,
  };

  const anomalyResults = await getAnomalies(params, mlAnomalySearch);

  if (isLoggedRequestsEnabled) {
    const searchQuery = buildAnomalyQuery(params);
    searchQuery.index = '.ml-anomalies-*';
    loggedRequests.push({
      request: logSearchRequest(searchQuery),
      description: i18n.ML_SEARCH_ANOMALIES_DESCRIPTION,
      duration: anomalyResults.took,
      request_type: 'findAnomalies',
    });
  }
  return { anomalyResults, ...(isLoggedRequestsEnabled ? { loggedRequests } : {}) };
};
