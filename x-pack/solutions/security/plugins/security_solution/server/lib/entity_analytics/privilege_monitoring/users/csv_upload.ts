/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Papa from 'papaparse';
import { Readable } from 'stream';
import { isRight } from 'fp-ts/Either';
import type { HapiReadableStream } from '../../../../types';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';
import { privilegedUserParserTransform } from './streams/privileged_user_parse_transform';
import { batchPartitions } from '../../shared/streams/batching';
import { bulkUpsertBatch } from './bulk/upsert_batch';

import { accumulateUpsertResults } from './bulk/utils';
import { queryExistingUsers } from './bulk/query_existing_users';

import { softDeleteOmittedUsers } from './bulk/soft_delete_omitted_users';
import { createPrivmonIndexService } from '../engine/elasticsearch/indices';
import type { BulkProcessingResults, Batch } from './bulk/types';

export const createPrivilegedUsersCsvService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps, index } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;

  const bulkUpload = async (
    stream: HapiReadableStream,
    options: { retries: number; flushBytes: number; maxUsersAllowed: number }
  ) => {
    // Generate unique identifier for this upload session
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    dataClient.log(
      'debug',
      `[${uploadId}] Starting CSV bulk upload with maxUsersAllowed: ${options.maxUsersAllowed}`
    );

    await checkAndInitPrivilegedMonitoringResources();

    // Get current user count but don't fail immediately
    const currentUserCount = await esClient.count({
      index,
      query: {
        term: {
          'user.is_privileged': true,
        },
      },
    });

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

    let runningUserCount = currentUserCount.count;
    let batchNumber = 0;

    for await (const batch of batches) {
      batchNumber++;
      const batchId = `${uploadId}_batch_${batchNumber}`;

      // Query existing users to separate new vs existing
      const batchWithExisting = await queryExistingUsers(esClient, index)(batch);

      // Filtering: separate new users from existing users
      const { newUsersBatch, existingUsersBatch } = separateNewAndExistingUsers(batchWithExisting);

      const newUsersCount = newUsersBatch.uploaded.length;
      const existingUsersCount = existingUsersBatch.uploaded.length;

      dataClient.log(
        'debug',
        `[${batchId}] Separated users - New: ${newUsersCount}, Existing: ${existingUsersCount}`
      );

      // Calculate how many new users we can still add based on current running count
      const availableSlots = Math.max(0, options.maxUsersAllowed - runningUserCount);

      // Limit new users to available slots
      const newUsersToProcess =
        availableSlots > 0 ? newUsersBatch.uploaded.slice(0, availableSlots) : [];
      const newUsersRejected = newUsersBatch.uploaded.slice(availableSlots);

      const newUsersAccepted = newUsersToProcess.length;

      // Create batch with allowed users (all existing + limited new users)
      const processedBatch: Batch = {
        uploaded: [...existingUsersBatch.uploaded, ...newUsersToProcess],
        existingUsers: batchWithExisting.existingUsers,
      };
      // Process the allowed users
      if (processedBatch.uploaded.length > 0) {
        const upserted = await bulkUpsertBatch(esClient, index, options)(processedBatch);
        results = accumulateUpsertResults(results, upserted);

        // Update running count with new users that were actually successfully created
        // Only count new users, not existing user updates
        const previousRunningCount = runningUserCount;
        runningUserCount += newUsersAccepted; // Add the new users we attempted to process
        dataClient.log(
          'debug',
          `[${batchId}] Updated running count after processing: ${previousRunningCount} → ${runningUserCount}`
        );
      } else {
        dataClient.log('debug', `[${batchId}] Skipping bulk upsert - no users to process`);
      }

      // Add errors for rejected new users
      let rejectedErrorsAdded = 0;
      newUsersRejected.forEach((userEither) => {
        if (isRight(userEither)) {
          results.errors.push({
            message: `Maximum user limit of ${options.maxUsersAllowed} reached. Cannot add new user.`,
            username: userEither.right.username,
            index: userEither.right.index,
          });
          results.failed++;
          rejectedErrorsAdded++;
        }
      });

      // Log if we've reached the limit
      if (runningUserCount >= options.maxUsersAllowed) {
        dataClient.log(
          'info',
          `Maximum user limit reached (${options.maxUsersAllowed}). All subsequent new users will be rejected.`
        );
      }
    }
    const softDeletedResults = await softDeleteOmittedUsers(esClient, index, options)(results);

    const finalStats = {
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

    dataClient.log('info', `[${uploadId}] CSV bulk upload completed`);
    dataClient.log(
      'info',
      `[${uploadId}] Final statistics: ${finalStats.stats.successful} successful, ${finalStats.stats.failed} failed, ${finalStats.stats.total} total`
    );
    dataClient.log('info', `[${uploadId}] Total errors: ${finalStats.errors.length}`);

    return finalStats;
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

  // Helper function to separate new and existing users
  const separateNewAndExistingUsers = (batch: Batch) => {
    const newUsersBatch: Batch = { uploaded: [], existingUsers: batch.existingUsers };
    const existingUsersBatch: Batch = { uploaded: [], existingUsers: batch.existingUsers };


    const { left: errors, right: usrs } = A.separate(batch.uploaded)
    const { left: existingUsers, right: newUsers } = A.partition(({ username }) => batch.existingUsers[username])(usrs)
    
    return { 
      errors, // probably good to preserve the errors too
      existingUsersBatch: { uploaded: existingUsers },
      newUsersBatch: { uploaded: newUsers }
    }

    return { newUsersBatch, existingUsersBatch };
  };

  return { bulkUpload };
};
