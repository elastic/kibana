/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  CcsLogExtractionStateTypeName,
  CpsLogExtractionStateTypeName,
  RemoteLogExtractionStateClient,
} from '../../saved_objects';
import { RemoteLogsExtractionClient } from './remote_logs_extraction_client';
import { createCcsStrategy, createCpsStrategy } from './strategies';

interface CreateRemoteLogsExtractionClientOpts {
  logger: Logger;
  namespace: string;
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  cpsClient: ElasticsearchClient;
  isServerless: boolean;
}

interface CreateRemoteLogsExtractionClientResult {
  client: RemoteLogsExtractionClient;
  /** Returned so callers can hand the same instance to AssetManager for SO cleanup. */
  stateClient: RemoteLogExtractionStateClient;
}

/**
 * Build the remote-extraction client (and matching state SO client) for the
 * active deployment:
 *  - serverless → CPS (uses `cpsClient`, persists to `entity-store-cps-state`)
 *  - stateful   → CCS (uses `esClient`, persists to `entity-store-ccs-state`)
 *
 * Mutually exclusive: a deployment is one or the other.
 */
export function createRemoteLogsExtractionClient({
  logger,
  namespace,
  soClient,
  esClient,
  cpsClient,
  isServerless,
}: CreateRemoteLogsExtractionClientOpts): CreateRemoteLogsExtractionClientResult {
  const stateClient = new RemoteLogExtractionStateClient(
    soClient,
    namespace,
    logger,
    isServerless ? CpsLogExtractionStateTypeName : CcsLogExtractionStateTypeName
  );
  const client = new RemoteLogsExtractionClient(
    logger,
    namespace,
    isServerless
      ? createCpsStrategy(cpsClient, stateClient)
      : createCcsStrategy(esClient, stateClient)
  );
  return { client, stateClient };
}
