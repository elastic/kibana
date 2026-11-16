/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { getServiceAccountGenerationQuery } from '../get_service_account_generation_query';

/**
 * Returns true when a generation in the space was written by a service account (e.g. an
 * AlertZero Worker), so its Attack discoveries belong to no single user
 */
export const isServiceAccountGeneration = async ({
  esClient,
  eventLogIndex,
  executionUuid,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  eventLogIndex: string;
  executionUuid: string;
  spaceId: string;
}): Promise<boolean> => {
  const { hits } = await esClient.search(
    getServiceAccountGenerationQuery({ eventLogIndex, executionUuid, spaceId })
  );

  const total = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;

  return total > 0;
};
