/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import {
  NightshiftModelBlockedError,
  NightshiftModelNotFoundError,
} from '@kbn/significant-events-schema';
import {
  InvestigationNotFoundError,
  InvestigationQuotaDeniedError,
  InvestigationMetadataMissingError,
  InvestigationUnavailableError,
} from '../client/errors';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

const mapStatusCode = (error: Error): number => {
  try {
    rethrowInvestigationClientError(error);
  } catch (mappedError) {
    if (isBoom(mappedError)) {
      return mappedError.output.statusCode;
    }
    throw mappedError;
  }
};

describe('rethrowInvestigationClientError', () => {
  it.each([
    [new InvestigationNotFoundError('investigation-1'), 404],
    [new InvestigationMetadataMissingError('investigation-1'), 400],
    [new InvestigationUnavailableError('Unavailable'), 503],
    [new InvestigationQuotaDeniedError(), 429],
    [new NightshiftModelNotFoundError('missing-model'), 400],
    [new NightshiftModelBlockedError('blocked-model', 'default-model'), 400],
    [
      Object.assign(new Error('Missing manage_investigations'), {
        name: 'InvestigationsForbiddenError',
      }),
      403,
    ],
    [
      Object.assign(new Error('Too many subjects'), {
        name: 'InvestigationAttachmentInvalidRequestError',
      }),
      400,
    ],
    [
      Object.assign(new Error('Concurrent update'), {
        name: 'InvestigationAttachmentConflictError',
      }),
      409,
    ],
  ])('maps %s to HTTP %i', (error, statusCode) => {
    expect(mapStatusCode(error)).toBe(statusCode);
  });
});
