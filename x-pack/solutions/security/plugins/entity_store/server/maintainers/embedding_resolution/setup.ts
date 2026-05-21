/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface VerifyInferenceEndpointResult {
  /** True if the configured `_inference` endpoint exists and is callable. */
  ready: boolean;
  /** Endpoint-reported `service_settings.dimensions`, when present. */
  dims?: number;
}

/**
 * Confirms the configured `_inference` endpoint exists before the maintainer
 * tries to embed anything. Pattern mirrors
 * x-pack/platform/plugins/shared/inference_endpoint/server/lib/inference_endpoint_exists.ts
 * but additionally returns the endpoint's dimensions so the run loop can
 * surface dims-mismatch warnings early (the `dense_vector` mapping is
 * locked to 1024 dims at index creation time).
 *
 * Returning `{ ready: false }` instead of throwing on 404 lets the maintainer
 * no-op gracefully when EIS has not yet been connected at /app/cloud_connect.
 * Any other error (auth, network, 5xx) is re-thrown so it surfaces in the
 * Engine Status tab instead of being silently swallowed.
 */
export async function verifyInferenceEndpoint({
  esClient,
  inferenceId,
  expectedDims,
  logger,
}: {
  esClient: ElasticsearchClient;
  inferenceId: string;
  expectedDims: number;
  logger: Logger;
}): Promise<VerifyInferenceEndpointResult> {
  try {
    const response = (await esClient.inference.get({ inference_id: inferenceId })) as {
      endpoints?: Array<{ service_settings?: { dimensions?: number } }>;
    };

    const dims = response?.endpoints?.[0]?.service_settings?.dimensions;

    if (dims !== undefined && dims !== expectedDims) {
      logger.warn(
        `Inference endpoint '${inferenceId}' reports dimensions=${dims} but ` +
          `entity.resolution.embedding is mapped with dims=${expectedDims}. ` +
          `Writes will fail with mapper_parsing_exception. Either reconfigure ` +
          `xpack.securitySolution.entityResolution.embedding.inferenceId to an ` +
          `endpoint with ${expectedDims} dims, or reindex entities-latest-<ns> ` +
          `with a matching dense_vector mapping (immutable after creation).`
      );
    }

    return { ready: true, dims };
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode === 404) {
      logger.warn(
        `Inference endpoint '${inferenceId}' not found. The embedding-resolution ` +
          `maintainer will no-op until you connect EIS at /app/cloud_connect, or ` +
          `override xpack.securitySolution.entityResolution.embedding.inferenceId ` +
          `with an existing endpoint id.`
      );
      return { ready: false };
    }
    throw err;
  }
}
