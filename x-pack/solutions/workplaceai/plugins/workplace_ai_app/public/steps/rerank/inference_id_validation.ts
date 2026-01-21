/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { PropertyValidationResult, PropertyCompletionOption } from '@kbn/workflows';

interface InferenceEndpoint {
  inference_id: string;
  service: string;
  task_type: string;
}

interface InferenceEndpointsResponse {
  inference_endpoints: InferenceEndpoint[];
}

let cachedEndpoints: InferenceEndpoint[] | null = null;
let cachePromise: Promise<InferenceEndpoint[]> | null = null;

async function loadInferenceEndpoints(http: HttpStart): Promise<InferenceEndpoint[]> {
  if (cachedEndpoints !== null) {
    return cachedEndpoints;
  }

  if (cachePromise !== null) {
    return cachePromise;
  }

  cachePromise = http
    .get<InferenceEndpointsResponse>('/internal/workplace_ai/inference_endpoints')
    .then((response) => {
      const rerankEndpoints = response.inference_endpoints.filter(
        (ep) => ep.task_type === 'rerank'
      );
      cachedEndpoints = rerankEndpoints;
      cachePromise = null;
      return rerankEndpoints;
    })
    .catch((error) => {
      cachePromise = null;
      throw error;
    });

  return cachePromise;
}

export function createInferenceIdValidator(http: HttpStart) {
  return async (value: unknown): Promise<PropertyValidationResult> => {
    if (value === null || value === undefined || value === '') {
      return { severity: null };
    }

    if (typeof value !== 'string') {
      return { severity: 'error', message: 'Inference ID must be a string' };
    }

    try {
      const endpoints = await loadInferenceEndpoints(http);

      if (endpoints.length === 0) {
        return {
          severity: 'error',
          message: 'No rerank inference endpoints configured',
          hoverMessage:
            'At least one rerank inference endpoint must be configured in Elasticsearch.',
        };
      }

      const endpoint = endpoints.find((ep) => ep.inference_id === value);

      if (!endpoint) {
        const availableIds = endpoints.map((ep) => ep.inference_id).join(', ');
        return {
          severity: 'error',
          message: `Inference endpoint "${value}" not found`,
          hoverMessage: `Available rerank endpoints: ${availableIds}`,
        };
      }

      return {
        severity: null,
        afterMessage: `✓ Valid endpoint (${endpoint.service})`,
      };
    } catch (error) {
      return {
        severity: 'warning',
        message: 'Unable to validate inference endpoint',
        hoverMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}

export function createInferenceIdCompletion(http: HttpStart) {
  return async (currentValue: unknown): Promise<PropertyCompletionOption[]> => {
    try {
      const endpoints = await loadInferenceEndpoints(http);
      const currentValueString = typeof currentValue === 'string' ? currentValue.trim() : '';

      return endpoints
        .filter(
          (endpoint) =>
            currentValueString === '' || endpoint.inference_id.includes(currentValueString)
        )
        .map((endpoint) => ({
          label: endpoint.inference_id,
          value: endpoint.inference_id,
          detail: `Service: ${endpoint.service}`,
        }));
    } catch (error) {
      return [];
    }
  };
}
