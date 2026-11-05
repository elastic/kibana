/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationErrorsResponse } from '../../../../common/types/errors';
import type { ApplicationData, ApplicationRequest } from '../../../hooks/use_application_data';
import { useApplicationData } from '../../../hooks/use_application_data';

export type ApplicationErrors = ApplicationData<ApplicationErrorsResponse>;

const errorsRequest: ApplicationRequest<ApplicationErrorsResponse> = (apiClient, options) => {
  return apiClient.fetch(
    'GET /internal/digital_experience/applications/{serviceName}/errors',
    options
  );
};

/**
 * The JS error groups of one application in the selected time range and environment, for the Errors
 * tab and the Overview's top errors.
 */
export const useApplicationErrors = (serviceName: string): ApplicationErrors => {
  return useApplicationData(serviceName, errorsRequest);
};
