/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Papa from 'papaparse';
import { Readable } from 'stream';
import type { HapiReadableStream } from '../../../../types';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';
import { privilegedUserParserTransform } from './streams/privileged_user_parse_transform';
import { batchPartitions } from '../../shared/streams/batching';
import { bulkUpsertBatch } from './bulk/upsert_batch';

import { accumulateUpsertResults } from './bulk/utils';
import { queryExistingUsers } from './bulk/query_existing_users';

import { softDeleteOmittedUsers } from './bulk/soft_delete_omitted_users';
import { createPrivmonIndexService } from '../engine/elasticsearch/indices';
import type { BulkProcessingResults } from './bulk/types';

export const createPrivilegedUsersCsvService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps, index } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;

  const bulkUpload = async (
    stream: HapiReadableStream,
    options: { retries: number; flushBytes: number }
  ) => {
    await checkAndInitPrivilegedMonitoringResources();

    const csvStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    const batches = Readable.from(stream.pipe(csvStream))
      .pipe(privilegedUserParserTransform())
      .pipe(batchPartitions(100));

    let results: BulkProcessingResults = {
      users: [],
      errors: [],
      failed: 0,
      successful: 0,
    };
    for await (const batch of batches) {
      const usrs = await queryExistingUsers(esClient, index)(batch);
      const upserted = await bulkUpsertBatch(esClient, index, options)(usrs);
      results = accumulateUpsertResults(
        { users: [], errors: [], failed: 0, successful: 0 },
        upserted
      );
    }

    const softDeletedResults = await softDeleteOmittedUsers(esClient, index, options)(results);

    return {
      errors: softDeletedResults.updated.errors.concat(softDeletedResults.deleted.errors),
      stats: {
        failed: softDeletedResults.updated.failed + softDeletedResults.deleted.failed,
        successful: softDeletedResults.updated.successful + softDeletedResults.deleted.successful,
        total:
          softDeletedResults.updated.failed +
          softDeletedResults.updated.successful +
          softDeletedResults.deleted.failed +
          softDeletedResults.deleted.successful,
      },
    };
  };

  /**
   * Checks and initializes the privilege monitoring resources if they do not exist.
   * We only need this for the CSV upload scenario
   */
  const checkAndInitPrivilegedMonitoringResources = async () => {
    const IndexService = createPrivmonIndexService(dataClient);

    await IndexService.createIngestPipelineIfDoesNotExist();
    const found = await IndexService.doesIndexExist();
    if (!found) {
      dataClient.log('info', 'Privilege monitoring index does not exist, initialising.');
      await IndexService.upsertIndex();
      dataClient.log('info', 'Privilege monitoring resources installed');
    }
  };

  return { bulkUpload };
};
