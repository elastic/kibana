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
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import {
  isUserLimitReached,
  findUserByUsername,
  updateUserWithSource,
  createUserDocument,
} from './utils';

interface CsvAnalysisResult {
  allUsers: Array<{
    username: string;
    name?: string;
    email?: string;
    label?: string;
    index: number;
  }>;
  parseErrors: Array<{ message: string; index: number }>;
  uniqueUsernames: string[];
  totalUsers: number;
}

interface CapacityPlan {
  existingUsersToUpdate: string[];
  newUsersToCreate: string[];
  newUsersToReject: string[];
  usersToSoftDelete: string[];
  availableSlots: number;
  warnings: string[];
  isAtCapacity: boolean;
}

export const createPrivilegedUsersCsvService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps, index } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;

  // Helper function to get user by ID (equivalent to crud service's get function)
  const getUser = async (id: string): Promise<MonitoredUserDoc | undefined> => {
    try {
      const response = await esClient.get<MonitoredUserDoc>({ index, id });
      return response.found
        ? ({ ...response._source, id: response._id } as MonitoredUserDoc)
        : undefined;
    } catch (error) {
      // If document doesn't exist, return undefined
      return undefined;
    }
  };

  const bulkUpload = async (
    stream: HapiReadableStream,
    options: { retries: number; flushBytes: number; maxUsersAllowed?: number }
  ) => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const maxUsersAllowed = options.maxUsersAllowed || 1000;

    dataClient.log('debug', `[${uploadId}] Starting CSV bulk upload with 2-phase process`);

    try {
      // Step 0: File Size Validation and Buffering
      dataClient.log('debug', `[${uploadId}] Step 0: File size validation and buffering`);

      let totalBytesRead = 0;
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        totalBytesRead += chunk.length;

        if (totalBytesRead > options.flushBytes) {
          dataClient.log(
            'warn',
            `[${uploadId}] File size exceeded: ${totalBytesRead} bytes > ${options.flushBytes} bytes`
          );
          return {
            errors: [
              {
                message: `CSV file size (${totalBytesRead.toLocaleString()} bytes) exceeds maximum allowed size (${options.flushBytes.toLocaleString()} bytes).`,
              },
            ],
            stats: { failed: 0, successful: 0, total: 0 },
          };
        }

        chunks.push(chunk);
      }

      const fileBuffer = Buffer.concat(chunks);
      dataClient.log(
        'info',
        `[${uploadId}] Step 0 Complete: File buffered (${totalBytesRead} bytes)`
      );

      await checkAndInitPrivilegedMonitoringResources();

      // Early capacity check using utility function
      const isCurrentlyAtLimit = await isUserLimitReached(esClient, index, maxUsersAllowed);
      dataClient.log(
        'info',
        `[${uploadId}] Initial capacity check: ${
          isCurrentlyAtLimit ? 'AT LIMIT' : 'CAPACITY AVAILABLE'
        }`
      );

      // ========================================
      // PHASE 1: STREAM PROCESSING ONLY
      // ========================================
      dataClient.log('debug', `[${uploadId}] PHASE 1: Stream processing and CSV analysis`);

      const csvAnalysis = await analyzeCsvContent(fileBuffer, uploadId);

      dataClient.log(
        'info',
        `[${uploadId}] PHASE 1 Complete: Analyzed ${csvAnalysis.totalUsers} users, ${csvAnalysis.uniqueUsernames.length} unique, ${csvAnalysis.parseErrors.length} errors`
      );

      // Early return if only parse errors
      if (csvAnalysis.allUsers.length === 0) {
        return {
          errors: csvAnalysis.parseErrors.map((err) => ({
            message: err.message,
            index: err.index,
          })),
          stats: {
            failed: csvAnalysis.parseErrors.length,
            successful: 0,
            total: csvAnalysis.parseErrors.length,
          },
        };
      }

      // ========================================
      // PHASE 2: BUSINESS LOGIC AND CAPACITY PLANNING
      // ========================================
      dataClient.log('debug', `[${uploadId}] PHASE 2: Capacity planning and business logic`);

      const capacityPlan = await createCapacityPlan(csvAnalysis, maxUsersAllowed, uploadId);

      dataClient.log(
        'info',
        `[${uploadId}] PHASE 2 Complete: Plan created - ${capacityPlan.existingUsersToUpdate.length} updates, ${capacityPlan.newUsersToCreate.length} creates, ${capacityPlan.newUsersToReject.length} rejects`
      );

      // Log warnings if any
      capacityPlan.warnings.forEach((warning) => {
        dataClient.log('warn', `[${uploadId}] ${warning}`);
      });

      // ========================================
      // EXECUTION: APPLY THE PLAN
      // ========================================
      dataClient.log('debug', `[${uploadId}] EXECUTION: Applying capacity plan`);

      const executionResults = await executeCapacityPlan(
        csvAnalysis,
        capacityPlan,
        uploadId,
        maxUsersAllowed
      );

      // Combine all results
      const finalStats = {
        errors: [
          ...csvAnalysis.parseErrors.map((err) => ({ message: err.message, index: err.index })),
          ...executionResults.errors,
        ],
        stats: {
          failed: csvAnalysis.parseErrors.length + executionResults.failed,
          successful: executionResults.successful,
          total:
            csvAnalysis.parseErrors.length + executionResults.failed + executionResults.successful,
        },
      };

      dataClient.log(
        'info',
        `[${uploadId}] COMPLETE: ${finalStats.stats.successful} successful, ${finalStats.stats.failed} failed, ${finalStats.stats.total} total`
      );

      return finalStats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dataClient.log(
        'error',
        `[${uploadId}] Critical error during CSV processing: ${errorMessage}`
      );

      return {
        errors: [{ message: `CSV processing failed: ${errorMessage}` }],
        stats: { failed: 1, successful: 0, total: 1 },
      };
    }
  };

  // ========================================
  // PHASE 1: PURE STREAM PROCESSING
  // ========================================
  const analyzeCsvContent = async (
    fileBuffer: Buffer,
    uploadId: string
  ): Promise<CsvAnalysisResult> => {
    const allUsers: Array<{
      username: string;
      name?: string;
      email?: string;
      label?: string;
      index: number;
    }> = [];
    const parseErrors: Array<{ message: string; index: number }> = [];

    const stream = Readable.from(fileBuffer);
    const csvStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    const batches = Readable.from(stream.pipe(csvStream))
      .pipe(privilegedUserParserTransform())
      .pipe(batchPartitions(100));

    // Pure stream processing - no business logic here
    for await (const batch of batches) {
      batch.forEach((userEither: Either<unknown, unknown>) => {
        if (isRight(userEither)) {
          allUsers.push(
            userEither.right as {
              username: string;
              name?: string;
              email?: string;
              label?: string;
              index: number;
            }
          );
        } else {
          parseErrors.push({
            message: 'Failed to parse CSV row',
            index: (userEither.left as { index?: number }).index || 0,
          });
        }
      });
    }

    const uniqueUsernames = [...new Set(allUsers.map((user) => user.username))];

    return {
      allUsers,
      parseErrors,
      uniqueUsernames,
      totalUsers: allUsers.length,
    };
  };

  // ========================================
  // PHASE 2: PURE BUSINESS LOGIC
  // ========================================
  const createCapacityPlan = async (
    csvAnalysis: CsvAnalysisResult,
    maxUsersAllowed: number,
    uploadId: string
  ): Promise<CapacityPlan> => {
    // Get current system state
    const allExistingUsersResponse = await esClient.search({
      index,
      query: { term: { 'user.is_privileged': true } },
      size: 10000,
      _source: ['user.name'],
    });

    const existingUsernames = allExistingUsersResponse.hits.hits
      .map((hit) => (hit._source as MonitoredUserDoc)?.user?.name)
      .filter((name): name is string => Boolean(name));

    // Categorize users
    const existingUsersToUpdate = csvAnalysis.uniqueUsernames.filter((username) =>
      existingUsernames.includes(username)
    );

    const newUsernames = csvAnalysis.uniqueUsernames.filter(
      (username) => !existingUsernames.includes(username)
    );

    const usersToSoftDelete = existingUsernames.filter(
      (username) => !csvAnalysis.uniqueUsernames.includes(username)
    );

    // Calculate capacity after soft-deletes
    const currentCount = existingUsernames.length;
    const countAfterSoftDelete = currentCount - usersToSoftDelete.length;
    const countAfterUpdates = countAfterSoftDelete; // Updates don't change count
    const availableSlots = Math.max(0, maxUsersAllowed - countAfterUpdates);

    const newUsersToCreate = newUsernames.slice(0, availableSlots);
    const newUsersToReject = newUsernames.slice(availableSlots);

    // Use utility function for final capacity check
    const willReachCapacityAfterUpload = await isUserLimitReached(
      esClient,
      index,
      maxUsersAllowed - newUsersToCreate.length // Check if we'll be at capacity after adding new users
    );

    // Generate warnings
    const warnings: string[] = [];
    if (newUsersToReject.length > 0) {
      warnings.push(
        `${newUsersToReject.length} new users will be rejected due to capacity limits (${maxUsersAllowed} max users)`
      );
    }
    if (usersToSoftDelete.length > 0) {
      warnings.push(`${usersToSoftDelete.length} existing users not in CSV will be soft-deleted`);
    }
    if (willReachCapacityAfterUpload && newUsersToCreate.length > 0) {
      warnings.push(
        `System will be at capacity after processing ${newUsersToCreate.length} new users`
      );
    }

    dataClient.log(
      'info',
      `[${uploadId}] Capacity Plan: Current=${currentCount}, After soft-delete=${countAfterSoftDelete}, Available slots=${availableSlots}, New to create=${newUsersToCreate.length}, To reject=${newUsersToReject.length}`
    );

    return {
      existingUsersToUpdate,
      newUsersToCreate,
      newUsersToReject,
      usersToSoftDelete,
      availableSlots,
      warnings,
      isAtCapacity: willReachCapacityAfterUpload,
    };
  };

  // ========================================
  // EXECUTION: APPLY THE PLAN
  // ========================================
  const executeCapacityPlan = async (
    csvAnalysis: CsvAnalysisResult,
    capacityPlan: CapacityPlan,
    uploadId: string,
    maxUsersAllowed: number
  ): Promise<{
    errors: Array<{ message: string; username?: string; index?: number }>;
    failed: number;
    successful: number;
  }> => {
    let successful = 0;
    let failed = 0;
    const errors: Array<{ message: string; username?: string; index?: number }> = [];

    // Step 1: Soft-delete omitted users
    if (capacityPlan.usersToSoftDelete.length > 0) {
      try {
        const softDeleteResponse = await esClient.updateByQuery({
          index,
          refresh: true,
          query: {
            bool: {
              must: [{ term: { 'user.is_privileged': true } }],
              must_not: [{ terms: { 'user.name': csvAnalysis.uniqueUsernames } }],
            },
          },
          script: { source: 'ctx._source.user.is_privileged = false' },
        });

        successful += softDeleteResponse.updated || 0;
        dataClient.log(
          'info',
          `[${uploadId}] Soft-deleted ${softDeleteResponse.updated || 0} users`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ message: `Failed to soft-delete users: ${errorMessage}` });
        failed += capacityPlan.usersToSoftDelete.length;
      }
    }

    // Step 2: Process users according to plan with capacity monitoring
    const usersToProcess = csvAnalysis.allUsers.filter(
      (csvUser) =>
        capacityPlan.existingUsersToUpdate.includes(csvUser.username) ||
        capacityPlan.newUsersToCreate.includes(csvUser.username)
    );

    let newUsersCreatedCount = 0;

    for (const csvUser of usersToProcess) {
      try {
        const existingUser = await findUserByUsername(esClient, index, csvUser.username);

        if (existingUser) {
          // Update existing user - doesn't affect capacity
          await updateUserWithSource(
            esClient,
            index,
            existingUser,
            'csv',
            {
              user: { name: csvUser.username },
            },
            getUser
          );
          successful++;
        } else if (capacityPlan.newUsersToCreate.includes(csvUser.username)) {
          // Double-check capacity before creating each new user (safety measure)
          const isAtLimitNow = await isUserLimitReached(esClient, index, maxUsersAllowed);

          if (isAtLimitNow) {
            errors.push({
              message: `User limit reached during processing. Cannot add more users.`,
              username: csvUser.username,
              index: csvUser.index,
            });
            failed++;
          } else {
            // Create new user
            await createUserDocument(
              esClient,
              index,
              {
                user: { name: csvUser.username },
              },
              'csv',
              getUser
            );
            successful++;
            newUsersCreatedCount++;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          message: `Failed to process user: ${errorMessage}`,
          username: csvUser.username,
          index: csvUser.index,
        });
        failed++;
      }
    }

    // Step 3: Add rejection errors for users over capacity
    csvAnalysis.allUsers
      .filter((csvUser) => capacityPlan.newUsersToReject.includes(csvUser.username))
      .forEach((csvUser) => {
        errors.push({
          message: `Maximum user limit of ${maxUsersAllowed} reached. Cannot add new user.`,
          username: csvUser.username,
          index: csvUser.index,
        });
        failed++;
      });

    dataClient.log(
      'info',
      `[${uploadId}] Execution complete: Created ${newUsersCreatedCount} new users, ${
        successful - newUsersCreatedCount
      } updates`
    );

    return { errors, failed, successful };
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
