/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { ElserPopulateError } from '../../../common/data/elser_populate_error';
import {
  ELSER_COLD_START_MESSAGE,
  ELSER_NOT_DEPLOYED_MESSAGE,
  ELSER_NO_ML_CAPACITY_MESSAGE,
  getElserErrorMessage,
} from './get_elser_error_message';

type ResponseErrorMeta = ConstructorParameters<typeof EsErrors.ResponseError>[0];

const responseError = (type: string, statusCode: number): EsErrors.ResponseError =>
  new EsErrors.ResponseError({
    statusCode,
    body: { error: { type, reason: 'reason' } },
    warnings: null,
  } as unknown as ResponseErrorMeta);

describe('getElserErrorMessage', () => {
  describe('when ELSER is deployed but still starting up (cold start)', () => {
    it('returns the cold-start message from a preserved bulk item error type', () => {
      const error = new ElserPopulateError(
        'Timed out after [10s] waiting for trained model deployment [.elser-2-elasticsearch] to start',
        'model_deployment_timeout_exception'
      );
      expect(getElserErrorMessage(error)).toBe(ELSER_COLD_START_MESSAGE);
    });

    it('returns the cold-start message from a transport error with status 408', () => {
      expect(getElserErrorMessage(responseError('some_other_type', 408))).toBe(
        ELSER_COLD_START_MESSAGE
      );
    });
  });

  describe('when the ELSER model is not deployed', () => {
    it('returns the not-deployed message from a preserved bulk item error type', () => {
      const error = new ElserPopulateError(
        'Inference endpoint not found [.elser-2-elasticsearch]',
        'resource_not_found_exception'
      );
      expect(getElserErrorMessage(error)).toBe(ELSER_NOT_DEPLOYED_MESSAGE);
    });

    it('returns the not-deployed message from a transport error with status 404', () => {
      expect(getElserErrorMessage(responseError('some_other_type', 404))).toBe(
        ELSER_NOT_DEPLOYED_MESSAGE
      );
    });
  });

  describe('when there is no machine learning capacity to start ELSER', () => {
    it('returns the no-capacity message', () => {
      const error = new ElserPopulateError(
        'Could not start deployment because no suitable nodes were found',
        'status_exception'
      );
      expect(getElserErrorMessage(error)).toBe(ELSER_NO_ML_CAPACITY_MESSAGE);
    });
  });

  describe('when the error is unrelated to ELSER', () => {
    it('returns undefined for a plain error', () => {
      expect(getElserErrorMessage(new Error('boom'))).toBeUndefined();
    });

    it('returns undefined for an ELSER error with an unrecognized type', () => {
      const error = new ElserPopulateError('some unexpected reason', 'unexpected_exception');
      expect(getElserErrorMessage(error)).toBeUndefined();
    });

    it('returns undefined for a non-object error', () => {
      expect(getElserErrorMessage('a string error')).toBeUndefined();
      expect(getElserErrorMessage(undefined)).toBeUndefined();
    });
  });
});
