/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

/**
 * Inference endpoint used for the `semantic_text` field unless overridden.
 * ELSER is preconfigured on every cluster, so the common path needs no setup
 * beyond warming the deployment.
 */
export const MITRE_DEFAULT_INFERENCE_ID = defaultInferenceEndpoints.ELSER;

/** Warming a cold ELSER deployment includes a model download on first use. */
const WARMUP_TIMEOUT_MS = 10 * 60 * 1000;

interface EnsureSemanticEndpointParams {
  esClient: ElasticsearchClient;
  inferenceId: string;
  logger: Logger;
}

/**
 * Confirms the inference endpoint exists and has an allocated deployment.
 *
 * This runs before the `semantic_text` field is added to the mapping: once the
 * field exists, every index request routes through the endpoint, so an endpoint
 * that is missing or undeployed would turn a degraded-search situation into a
 * total hydration failure. Returning `false` lets the caller install the
 * keyword-only mapping instead.
 */
export const ensureSemanticEndpointAvailable = async ({
  esClient,
  inferenceId,
  logger,
}: EnsureSemanticEndpointParams): Promise<boolean> => {
  try {
    await esClient.inference.get({ inference_id: inferenceId });
  } catch (err) {
    logger.warn(
      `MITRE ATT&CK semantic search disabled: inference endpoint ${inferenceId} is not available (${
        err?.message ?? String(err)
      })`
    );
    return false;
  }

  try {
    await esClient.inference.inference(
      {
        inference_id: inferenceId,
        input: 'warm up the MITRE ATT&CK semantic search deployment',
        timeout: '5m',
      },
      { requestTimeout: WARMUP_TIMEOUT_MS }
    );
  } catch (err) {
    logger.warn(
      `MITRE ATT&CK semantic search disabled: inference endpoint ${inferenceId} failed to deploy (${
        err?.message ?? String(err)
      })`
    );
    return false;
  }

  logger.debug(`MITRE ATT&CK semantic search enabled using inference endpoint ${inferenceId}`);
  return true;
};
