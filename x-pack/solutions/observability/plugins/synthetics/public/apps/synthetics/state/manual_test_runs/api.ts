/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceLocationErrors, SyntheticsMonitor } from '../../../../../common/runtime_types';
import { TestNowResponse } from '../../../../../common/types';
import { apiService } from '../../../../utils/api_service';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';

async function performFetch<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    // this API service function throws errors that don't correspond to the expected Error type in the rest of the UI
    if (isUnknownError(e)) {
      throw new ManualTestRunError(e, e.body.message);
    }
    throw e;
  }
}

export const triggerTestNowMonitor = ({
  configId,
  spaceId,
}: {
  configId: string;
  name: string;
  spaceId?: string;
}): Promise<TestNowResponse | undefined> => {
  return performFetch(() =>
    apiService.post(SYNTHETICS_API_URLS.TRIGGER_MONITOR + `/${configId}`, undefined, undefined, {
      spaceId,
    })
  );
};

function isUnknownError(
  error: unknown
): error is { body: { message: string; error: string; statusCode: number } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'body' in error &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'message' in error.body &&
    'error' in error.body &&
    'statusCode' in error.body
  );
}

/**
 * API Service sends errors that do not correspond to `Error`, which
 * causes downstream issues. This class reformats the errors to correspond
 * to the `Error` class utilized throughout the UI, while keeping any additional
 * context.
 */
class ManualTestRunError extends Error {
  constructor(public original: unknown, message: string) {
    super(message);
    Object.assign(this, original);
  }
}

export const runOnceMonitor = ({
  monitor,
  id,
  spaceId,
}: {
  monitor: SyntheticsMonitor;
  id: string;
  spaceId?: string;
}): Promise<{ errors: ServiceLocationErrors }> => {
  return performFetch(() =>
    apiService.post(SYNTHETICS_API_URLS.RUN_ONCE_MONITOR + `/${id}`, monitor, undefined, {
      spaceId,
    })
  );
};
