/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '@kbn/alerting-plugin/common';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type { RouteValidationFunction, RouteValidationResultFactory } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { TypeOf, ZodType } from '@kbn/zod';
import type { InitEntityEngineRequestBody } from '../../../../../common/api/entity_analytics';

export const buildInitRequestBodyValidation =
  <ZodSchema extends ZodType, Type = TypeOf<ZodSchema>>(
    schema: ZodSchema
  ): RouteValidationFunction<Type> =>
  (inputValue: unknown, validationResultFactory: RouteValidationResultFactory) => {
    const zodValidationResult = buildRouteValidationWithZod(schema)(
      inputValue,
      validationResultFactory
    );
    if (zodValidationResult.error) return zodValidationResult;
    const additionalValidationResult = validateInitializationRequestBody(zodValidationResult.value);
    if (additionalValidationResult)
      return validationResultFactory.badRequest(additionalValidationResult);
    return zodValidationResult;
  };

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
    return new BadRequestError(
      'The enrich policy execution interval must be less than or equal to half the duration of the lookback period.'
    );
  }
};
