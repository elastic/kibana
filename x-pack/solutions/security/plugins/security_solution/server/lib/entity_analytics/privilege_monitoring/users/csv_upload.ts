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
import type { Accumulator } from './bulk/utils';
import { accumulateUpsertResults } from './bulk/utils';
import { queryExistingUsers } from './bulk/query_existing_users';
import type { SoftDeletionResults } from './bulk/soft_delete_omitted_users';
import { softDeleteOmittedUsers } from './bulk/soft_delete_omitted_users';
import { PrivmonIndexService } from '../engine/elasticsearch/indices';

export const PrivilegedUsersCSV = (dataClient: PrivilegeMonitoringDataClient) => {
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

    const res = Readable.from(stream.pipe(csvStream))
      .pipe(privilegedUserParserTransform())
      .pipe(batchPartitions(100)) // we cant use .map() because we need to hook into the stream flush to finish the last batch
      .map(queryExistingUsers(esClient, index))
      .map(bulkUpsertBatch(esClient, index, options))
      .reduce(accumulateUpsertResults, {
        users: [],
        errors: [],
        failed: 0,
        successful: 0,
      } satisfies Accumulator)

      .then(softDeleteOmittedUsers(esClient, index, options))
      .then((results: SoftDeletionResults) => {
        return {
          errors: results.updated.errors.concat(results.deleted.errors),
          stats: {
            failed: results.updated.failed + results.deleted.failed,
            successful: results.updated.successful + results.deleted.successful,
            total:
              results.updated.failed +
              results.updated.successful +
              results.deleted.failed +
              results.deleted.successful,
          },
        };
      });

    return res;
  };

  /**
   * Checks and initializes the privilege monitoring resources if they do not exist.
   * We only need this for the CSV upload scenario
   */
  const checkAndInitPrivilegedMonitoringResources = async () => {
    const IndexService = PrivmonIndexService(dataClient);

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
