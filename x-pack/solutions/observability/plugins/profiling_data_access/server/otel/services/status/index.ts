/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { OtelProfilingSchemaStatus } from '@kbn/profiling-utils';
import type { RegisterServicesParams } from '../../../services/register_services';
import { hasOtelProfilingData } from './has_otel_profiling_data';

export interface OtelStatusParams {
  esClient: IScopedClusterClient;
  /** When provided, ES calls are cancelled once the signal aborts. */
  abortSignal?: AbortSignal;
}

export function createGetOtelStatusService({ createProfilingEsClient }: RegisterServicesParams) {
  return async ({
    esClient,
    abortSignal,
  }: OtelStatusParams): Promise<OtelProfilingSchemaStatus> => {
    const client = createProfilingEsClient({ esClient: esClient.asCurrentUser, abortSignal });

    return {
      // OTel profiling needs no setup and is supported on every deployment type.
      isAvailable: true,
      hasData: await hasOtelProfilingData({ client }),
    };
  };
}
