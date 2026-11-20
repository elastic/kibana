/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScorecardReport } from '../../../../common/types/scorecard';
import type { ApplicationData, ApplicationRequest } from '../../../hooks/use_application_data';
import { useApplicationData } from '../../../hooks/use_application_data';

const scorecardRequest: ApplicationRequest<ScorecardReport> = (apiClient, options) =>
  apiClient.fetch(
    'GET /internal/digital_experience/applications/{serviceName}/report/scorecard',
    options
  );

/** The scorecard of one application in the selected time range and environment. */
export const useScorecardReport = (serviceName: string): ApplicationData<ScorecardReport> =>
  useApplicationData(serviceName, scorecardRequest);
