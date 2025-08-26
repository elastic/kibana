/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Papa from 'papaparse';
import { Readable } from 'stream';
import { isRight } from 'fp-ts/Either';
import type { Either } from 'fp-ts/Either';
import type { HapiReadableStream } from '../../../../types';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';
import { privilegedUserParserTransform } from './streams/privileged_user_parse_transform';
import { batchPartitions } from '../../shared/streams/batching';
import { createPrivmonIndexService } from '../engine/elasticsearch/indices';
import type { BulkProcessingResults, BulkProcessingError, BulkPrivMonUser } from './bulk/types';
import { findUserByUsername, createUserDocument, updateUserWithSource } from './utils';
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';

export const createPrivilegedUsersCsvService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps, index } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;

  // Adapter function to convert BulkPrivMonUser to format expected by helper functions
  const adaptBulkUserToHelperFormat = (
    bulkUser: BulkPrivMonUser
  ): { user?: { name?: string } } => ({
    user: {
      name: bulkUser.username,
    },
  });

  // Adapter function to convert helper response back to BulkPrivMonUser format
  const adaptHelperResponseToBulkFormat = (
    helperUser: { user?: { name?: string; is_privileged?: boolean } },
    originalIndex: number
  ): BulkPrivMonUser => ({
    username: helperUser.user?.name || '',
    index: originalIndex,
  });

  const bulkUpload = async (
    stream: HapiReadableStream,
    options: { retries: number; flushBytes: number }
  ) => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    dataClient.log('debug', `[${uploadId}] Starting CSV bulk upload`);

    // Step 1: Validate file size by reading stream chunks
    let totalBytesRead = 0;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      totalBytesRead += chunk.length;

      // Use flushBytes as file size limit
      if (totalBytesRead > options.flushBytes) {
        dataClient.log(
          'warn',
          `[${uploadId}] File size exceeded: ${totalBytesRead} bytes > ${options.flushBytes} bytes`
        );
        return {
          errors: [
            {
              message: `CSV file size (${totalBytesRead.toLocaleString()} bytes) exceeds maximum allowed size (${options.flushBytes.toLocaleString()} bytes).`,
              username: null,
              index: null,
            },
          ],
          stats: { failed: 0, successful: 0, total: 0 },
        };
      }

      chunks.push(chunk);
    }

    const fileBuffer = Buffer.concat(chunks);
    dataClient.log('info', `[${uploadId}] File size validated: ${totalBytesRead} bytes`);

    await checkAndInitPrivilegedMonitoringResources();

    // Step 2: Parse CSV and collect usernames first
    const stream1 = Readable.from(fileBuffer);
    const csvStream1 = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    const batches1 = Readable.from(stream1.pipe(csvStream1))
      .pipe(privilegedUserParserTransform())
      .pipe(batchPartitions(100));

    // Collect all CSV usernames for soft-delete logic
    const csvUsernames = new Set<string>();
    for await (const batch of batches1) {
      // batch is an array of Either<BulkProcessingError, BulkPrivMonUser> from batchPartitions
      batch.forEach((userEither: Either<BulkProcessingError, BulkPrivMonUser>) => {
        if (isRight(userEither)) {
          csvUsernames.add(userEither.right.username);
        }
      });
    }

    const totalCsvUsers = csvUsernames.size;
    dataClient.log('info', `[${uploadId}] CSV contains ${totalCsvUsers} unique users`);

    // Step 3: Process CSV users with username uniqueness checking
    const stream2 = Readable.from(fileBuffer);
    const csvStream2 = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    const batches2 = Readable.from(stream2.pipe(csvStream2))
      .pipe(privilegedUserParserTransform())
      .pipe(batchPartitions(100));

    const results: BulkProcessingResults = {
      users: [],
      errors: [],
      failed: 0,
      successful: 0,
    };

    // Process each batch with username uniqueness checking
    for await (const batch of batches2) {
      const batchResults: BulkProcessingResults = {
        users: [],
        errors: [],
        failed: 0,
        successful: 0,
      };

      // Process each user in the batch with uniqueness checking
      for (const userEither of batch) {
        if (!isRight(userEither)) {
          // Handle parsing errors
          batchResults.errors.push({
            message: 'Failed to parse user from CSV',
            username: userEither.left.username,
            index: userEither.left.index,
          });
          batchResults.failed++;
        } else {
          const csvUser = userEither.right as BulkPrivMonUser;

          try {
            // Check if user already exists by username
            const existingUser = await findUserByUsername(esClient, index, csvUser.username);

            if (existingUser) {
              // User exists - update with CSV source
              const updatedUser = await updateUserWithSource(
                esClient,
                index,
                existingUser,
                'csv',
                adaptBulkUserToHelperFormat(csvUser),
                async () => existingUser // get function returns the existing user
              );

              batchResults.users.push(adaptHelperResponseToBulkFormat(updatedUser, csvUser.index));
              batchResults.successful++;

              dataClient.log('debug', `[${uploadId}] Updated existing user: ${csvUser.username}`);
            } else {
              // User doesn't exist - create new user
              const newUser = await createUserDocument(
                esClient,
                index,
                adaptBulkUserToHelperFormat(csvUser),
                'csv',
                async () => ({ user: { name: csvUser.username, is_privileged: true } }) // return newly created user format
              );

              batchResults.users.push(adaptHelperResponseToBulkFormat(newUser, csvUser.index));
              batchResults.successful++;

              dataClient.log('debug', `[${uploadId}] Created new user: ${csvUser.username}`);
            }
          } catch (error) {
            dataClient.log(
              'error',
              `[${uploadId}] Failed to process user ${csvUser.username}: ${error.message}`
            );

            batchResults.errors.push({
              message: `Failed to process user: ${error.message}`,
              username: csvUser.username,
              index: csvUser.index,
            });
            batchResults.failed++;
          }
        }
      }

      // Accumulate batch results
      results.users.push(...batchResults.users);
      results.errors.push(...batchResults.errors);
      results.failed += batchResults.failed;
      results.successful += batchResults.successful;

      dataClient.log(
        'debug',
        `[${uploadId}] Processed batch: ${batchResults.successful} successful, ${batchResults.failed} failed`
      );
    }

    // Step 4: Soft-delete users not in CSV
    const softDeleteResults = await softDeleteUsersNotInCsv(Array.from(csvUsernames), uploadId);

    const finalStats = {
      errors: results.errors.concat(
        softDeleteResults.errors.map((error: { message: string; username?: string }) => ({
          message: error.message,
          username: error.username || null,
          index: null,
        }))
      ),
      stats: {
        failed: results.failed + softDeleteResults.failed,
        successful: results.successful + softDeleteResults.successful,
        total:
          results.failed +
          results.successful +
          softDeleteResults.failed +
          softDeleteResults.successful,
      },
    };

    dataClient.log(
      'info',
      `[${uploadId}] CSV bulk upload completed: ${finalStats.stats.successful} successful, ${finalStats.stats.failed} failed`
    );
    return finalStats;
  };

  /**
   * Soft-delete users that are currently privileged but not in the CSV
   */
  const softDeleteUsersNotInCsv = async (csvUsernames: string[], uploadId: string) => {
    const results = {
      errors: [] as Array<{ message: string; username?: string }>,
      failed: 0,
      successful: 0,
    };

    try {
      // Find users to soft-delete
      const usersToSoftDelete = await esClient.search({
        index,
        query: {
          bool: {
            must: [{ term: { 'user.is_privileged': true } }],
            must_not: [{ terms: { 'user.name': csvUsernames } }],
          },
        },
        size: 10000, // Reasonable limit
        _source: ['user.name'],
      });

      dataClient.log(
        'info',
        `[${uploadId}] Found ${usersToSoftDelete.hits.hits.length} users to soft-delete`
      );

      // Soft-delete each user
      for (const hit of usersToSoftDelete.hits.hits) {
        try {
          await esClient.update({
            index,
            id: hit._id || '',
            refresh: 'wait_for',
            doc: {
              user: {
                is_privileged: false,
              },
            },
          });
          results.successful++;
          dataClient.log(
            'debug',
            `[${uploadId}] Soft-deleted user: ${(hit._source as MonitoredUserDoc)?.user?.name}`
          );
        } catch (error) {
          results.errors.push({
            message: `Failed to soft-delete user: ${error.message}`,
            username: (hit._source as MonitoredUserDoc)?.user?.name,
          });
          results.failed++;
        }
      }
    } catch (error) {
      results.errors.push({
        message: `Failed to query users for soft-delete: ${error.message}`,
      });
      results.failed++;
    }

    return results;
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
