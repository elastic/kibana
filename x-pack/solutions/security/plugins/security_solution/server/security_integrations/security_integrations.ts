/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, RequestHandlerContext } from '@kbn/core/server';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { putCriblRoutingPipeline } from './handlers/put_cribl_routing_pipeline';
import { getRouteEntriesFromPolicyConfig } from '../../common/security_integrations/cribl/translator';

const isCriblPackagePolicy = <T extends { package?: { name: string } }>(
  packagePolicy: T
): boolean => {
  return packagePolicy.package?.name === 'cribl';
};

const createApiPassThroughError = (message: string): Error & { apiPassThrough: boolean } => {
  const error = new Error(message) as Error & { apiPassThrough: boolean };
  error.apiPassThrough = true;
  return error;
};

export const getCriblPackagePolicyPostCreateOrUpdateCallback = async (
  packagePolicy: NewPackagePolicy,
  logger: Logger,
  context?: RequestHandlerContext
): Promise<void> => {
  if (!isCriblPackagePolicy(packagePolicy)) {
    return;
  }

  const mappings = getRouteEntriesFromPolicyConfig(packagePolicy.vars);
  if (mappings.length === 0) {
    return;
  }

  if (!context) {
    throw createApiPassThroughError(
      'Unable to update Cribl routing pipeline: request context is required'
    );
  }

  const esClient: ElasticsearchClient = (await context.core).elasticsearch.client.asCurrentUser;
  return putCriblRoutingPipeline(esClient, packagePolicy, logger);
};
