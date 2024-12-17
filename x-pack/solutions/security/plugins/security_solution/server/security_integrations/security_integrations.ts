/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { putCriblRoutingPipeline } from './handlers/put_cribl_routing_pipeline';

const isCriblPackagePolicy = <T extends { package?: { name: string } }>(
  packagePolicy: T
): boolean => {
  return packagePolicy.package?.name === 'cribl';
};

export const getCriblPackagePolicyPostCreateOrUpdateCallback = async (
  esClient: ElasticsearchClient,
  packagePolicy: NewPackagePolicy,
  logger: Logger
): Promise<void> => {
  if (isCriblPackagePolicy(packagePolicy)) {
    return putCriblRoutingPipeline(esClient, packagePolicy, logger);
  }
};
