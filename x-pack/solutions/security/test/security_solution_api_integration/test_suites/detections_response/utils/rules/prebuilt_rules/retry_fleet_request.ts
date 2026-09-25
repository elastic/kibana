/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { Response } from 'supertest';

// Fleet reports EPR failures as 5xx, concurrent installs as 409, and rate limiting as 429
const TRANSIENT_STATUS_CODES: ReadonlySet<number> = new Set([408, 409, 429]);
const DEFAULT_RETRY_DELAY = 2_000;

/** Whether a Fleet API status code indicates a failure that may succeed on retry. */
export const isTransientFleetStatus = (statusCode: number): boolean =>
  statusCode >= 500 || TRANSIENT_STATUS_CODES.has(statusCode);

interface RetryFleetRequestOptions {
  description: string;
  retryDelay?: number;
  isTransient?: (response: Response) => boolean;
  isSuccess?: (response: Response) => boolean;
}

/**
 * Sends a Fleet API request, retrying network errors and transient responses until
 * `timeouts.try` expires, and failing immediately on any other unsuccessful response.
 */
export const retryFleetRequest = async (
  retryService: RetryService,
  sendRequest: () => Promise<Response>,
  {
    description,
    retryDelay = DEFAULT_RETRY_DELAY,
    isTransient = ({ status }) => isTransientFleetStatus(status),
    isSuccess = ({ status }) => status === 200,
  }: RetryFleetRequestOptions
): Promise<Response> => {
  const describeResponse = ({ status, body }: Response) =>
    `${description} responded with ${status}: ${JSON.stringify(body)}`;

  const response = await retryService.try(
    async () => {
      const attempt = await sendRequest();
      if (isTransient(attempt)) {
        throw new Error(describeResponse(attempt));
      }
      return attempt;
    },
    { description, retryDelay }
  );

  if (!isSuccess(response)) {
    throw new Error(describeResponse(response));
  }

  return response;
};
