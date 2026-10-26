/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { SLONotFound } from '../../../../errors';
import { getAuthenticationFailure } from './is_authentication_error';

const createResponseError = (statusCode: number, type: string) =>
  new EsErrors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode,
      body: { error: { type, reason: 'some reason' } },
    })
  );

describe('getAuthenticationFailure', () => {
  it('detects a 401 security_exception', () => {
    expect(getAuthenticationFailure(createResponseError(401, 'security_exception'))).toEqual({
      statusCode: 401,
      type: 'security_exception',
    });
  });

  it('detects a 403 security_exception', () => {
    expect(getAuthenticationFailure(createResponseError(403, 'security_exception'))).toEqual({
      statusCode: 403,
      type: 'security_exception',
    });
  });

  it('detects a 401 wrapped as a general saved objects error', () => {
    const error = SavedObjectsErrorHelpers.decorateGeneralError(
      createResponseError(401, 'security_exception')
    );

    expect(getAuthenticationFailure(error)).toEqual({
      statusCode: 401,
      type: 'security_exception',
    });
  });

  it('detects a 401 wrapped as a not authorized saved objects error', () => {
    const error = SavedObjectsErrorHelpers.decorateNotAuthorizedError(
      createResponseError(401, 'security_exception')
    );

    expect(getAuthenticationFailure(error)).toEqual({
      statusCode: 401,
      type: 'security_exception',
    });
  });

  it('detects a security_exception without a status code', () => {
    const error = Object.assign(new Error('security_exception'), {
      body: { error: { type: 'security_exception' } },
    });

    expect(getAuthenticationFailure(error)).toEqual({
      statusCode: undefined,
      type: 'security_exception',
    });
  });

  it('ignores a 500 response error', () => {
    expect(getAuthenticationFailure(createResponseError(500, 'internal_error'))).toBeUndefined();
  });

  it('ignores an SLO not found error', () => {
    expect(getAuthenticationFailure(new SLONotFound('SLO [id] not found'))).toBeUndefined();
  });

  it('ignores a plain error', () => {
    expect(getAuthenticationFailure(new Error('boom'))).toBeUndefined();
  });
});
