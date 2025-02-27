/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '@kbn/alerting-plugin/common';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type { InitEntityEngineRequestBody } from '../../../../../common/api/entity_analytics';

/**
 * Validations performed:
 * - Ensures that the enrich policy execution interval is less than or equal to half the duration of the lookback period,
 * as the execution policy must run successfully at least once within the lookback period in order to ensure no loss of
 * data
 */
export const validateInitializationRequestBody = (requestBody: InitEntityEngineRequestBody) => {
  const { lookbackPeriod, enrichPolicyExecutionInterval } = requestBody;
  if (!lookbackPeriod || !enrichPolicyExecutionInterval) return;
  const lookbackPeriodMillis = parseDuration(lookbackPeriod);
  const enrichPolicyExecutionIntervalMillis = parseDuration(enrichPolicyExecutionInterval);
  if (enrichPolicyExecutionIntervalMillis > lookbackPeriodMillis / 2) {
    throw new BadRequestError(
      'The enrich policy execution interval must be less than or equal to half the duration of the lookback period.'
    );
  }
};
