/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateInitializationRequestBody } from './validation';
import type { InitEntityEngineRequestBody } from '../../../../../common/api/entity_analytics';
import { BadRequestError } from '@kbn/securitysolution-es-utils';

describe('entity store initialization request validation', () => {
  const defaultRequestBody: InitEntityEngineRequestBody = {
    fieldHistoryLength: 10,
    timestampField: '@timestamp',
    lookbackPeriod: '24h',
    timeout: '180s',
    frequency: '1m',
    delay: '1m',
    enrichPolicyExecutionInterval: '1h',
    docsPerSecond: -1,
    maxPageSearchSize: 500,
  };
  it('should allow the default values (24 hour lookback period, 1 hour enrich policy interval)', () => {
    expect(validateInitializationRequestBody(defaultRequestBody)).toBeUndefined();
  });
  it('should allow the enrich policy interval to be exactly half the lookback period', () => {
    expect(
      validateInitializationRequestBody({
        ...defaultRequestBody,
        lookbackPeriod: '24h',
        enrichPolicyExecutionInterval: '12h',
      })
    ).toBeUndefined();
  });
  it('should allow the enrich policy interval to be barely less than half the lookback period', () => {
    expect(
      validateInitializationRequestBody({
        ...defaultRequestBody,
        lookbackPeriod: '24h',
        enrichPolicyExecutionInterval: '11h',
      })
    ).toBeUndefined();
  });
  it('should not allow the lookback period and enrich policy interval to be the same', () => {
    expect(
      validateInitializationRequestBody({
        ...defaultRequestBody,
        lookbackPeriod: '1h',
        enrichPolicyExecutionInterval: '1h',
      })
    ).toEqual(
      new BadRequestError(
        'The enrich policy execution interval must be less than or equal to half the duration of the lookback period.'
      )
    );
  });
  it('should not allow the enrich policy interval to be greater than the lookback period', () => {
    expect(
      validateInitializationRequestBody({
        ...defaultRequestBody,
        lookbackPeriod: '1h',
        enrichPolicyExecutionInterval: '2h',
      })
    ).toEqual(
      new BadRequestError(
        'The enrich policy execution interval must be less than or equal to half the duration of the lookback period.'
      )
    );
  });
  it('should not allow the enrich policy interval to be more than half the lookback period', () => {
    expect(
      validateInitializationRequestBody({
        ...defaultRequestBody,
        lookbackPeriod: '24h',
        enrichPolicyExecutionInterval: '13h',
      })
    ).toEqual(
      new BadRequestError(
        'The enrich policy execution interval must be less than or equal to half the duration of the lookback period.'
      )
    );
  });
});
