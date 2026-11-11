/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, RequestHandlerContext } from '@kbn/core/server';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { putCriblRoutingPipeline } from './handlers/put_cribl_routing_pipeline';

const isCriblPackagePolicy = <T extends { package?: { name: string } }>(
  packagePolicy: T
): boolean => {
  return packagePolicy.package?.name === 'cribl';
};

const createApiPassThroughError = (
  message: string,
  statusCode?: number
): Error & { apiPassThrough: boolean; statusCode?: number } => {
  const error = new Error(message) as Error & { apiPassThrough: boolean; statusCode?: number };
  error.apiPassThrough = true;
  if (statusCode !== undefined) {
    error.statusCode = statusCode;
  }
  return error;
};

/**
 * Writes the Cribl routing ingest pipeline for Cribl package policies.
 * Prefers the request-scoped Elasticsearch client when `context` is available;
 * falls back to `fallbackEsClient` for bulk/upgrade flows that do not provide context.
 */
export const getCriblPackagePolicyPostCreateOrUpdateCallback = async (
  packagePolicy: NewPackagePolicy,
  logger: Logger,
  context?: RequestHandlerContext,
  fallbackEsClient?: ElasticsearchClient
): Promise<void> => {
  if (!isCriblPackagePolicy(packagePolicy)) {
    return;
  }

  const esClient = context
    ? (await context.core).elasticsearch.client.asCurrentUser
    : fallbackEsClient;

  if (!esClient) {
    throw createApiPassThroughError(
      'Unable to update Cribl routing pipeline: request context is required',
      500
    );
  }

  return putCriblRoutingPipeline(esClient, packagePolicy, logger);
};
