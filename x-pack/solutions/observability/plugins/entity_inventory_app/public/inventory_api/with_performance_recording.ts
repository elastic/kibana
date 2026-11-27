/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListResponse } from '@kbn/entity-inventory-plugin/common';
import type {
  ListCallDiagnostics,
  PerformanceRecorder,
} from '../application/performance_overlay/performance_recorder';
import type { EntityInventoryApiClient, EntityInventoryRequestOptions } from './client';

const toListDiagnostics = ({
  queries,
  probes,
  timings,
  truncated,
  rows,
  unavailableColumns,
}: ListResponse): ListCallDiagnostics => ({
  queries,
  probes,
  timings,
  truncated,
  unavailableColumns,
  rowCount: rows.length,
});

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Decorates the client so each call is timed into the recorder while `isRecording()` is true;
 * otherwise a call goes straight to the client.
 */
export const withPerformanceRecording = (
  client: EntityInventoryApiClient,
  recorder: PerformanceRecorder,
  isRecording: () => boolean
): EntityInventoryApiClient => {
  const timed = async <T>(
    route: string,
    { signal }: EntityInventoryRequestOptions,
    call: () => Promise<T>,
    toList: (response: T) => ListCallDiagnostics | null
  ): Promise<T> => {
    const startedAt = Date.now();
    const start = performance.now();
    try {
      const response = await call();
      const list = toList(response);
      recorder.record({
        route,
        startedAt,
        browserMs: performance.now() - start,
        status: 'ok',
        serverMs: list?.timings.totalMs ?? null,
        errorMessage: null,
        list,
      });
      return response;
    } catch (error) {
      // An aborted call is a superseded request, recorded as such rather than as a failure.
      recorder.record({
        route,
        startedAt,
        browserMs: performance.now() - start,
        status: signal?.aborted ? 'aborted' : 'error',
        serverMs: null,
        errorMessage: toErrorMessage(error),
        list: null,
      });
      throw error;
    }
  };

  return {
    getTypes: (options) =>
      isRecording()
        ? timed(
            'types',
            options,
            () => client.getTypes(options),
            () => null
          )
        : client.getTypes(options),
    getEntities: (type, request, options) =>
      isRecording()
        ? timed(
            `${type}/_list`,
            options,
            () => client.getEntities(type, request, options),
            toListDiagnostics
          )
        : client.getEntities(type, request, options),
  };
};
