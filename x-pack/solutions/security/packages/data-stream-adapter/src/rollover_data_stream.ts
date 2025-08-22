/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface RolloverDataStreamParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  dataStreamName: string;
}

/**
 * Rolls over a data stream to create a new backing index
 */
export async function rolloverDataStream({
  esClient,
  logger,
  dataStreamName,
}: RolloverDataStreamParams): Promise<void> {
  logger.info(`Rolling over data stream: ${dataStreamName}`);

  try {
    const response = await esClient.indices.rollover({
      alias: dataStreamName,
      lazy: true,
    });

    if (response.acknowledged) {
      logger.info(`Successfully rolled over data stream: ${dataStreamName}`);
    } else {
      logger.warn(`Rollover for data stream ${dataStreamName} was not acknowledged`);
    }
  } catch (error) {
    logger.error(`Failed to rollover data stream ${dataStreamName}: ${error.message}`);
    throw error;
  }
}

/**
 * Checks if a data stream needs rollover based on error conditions
 */
export function shouldRolloverDataStream(error: unknown): boolean {
  if (
    !error ||
    typeof error !== 'object' ||
    !('body' in error) ||
    !error.body ||
    typeof error.body !== 'object'
  ) {
    return false;
  }
  const { body } = error as { body: { error?: { type?: string; reason?: string } } };

  if (!body.error) {
    return false;
  }

  const errorType = body.error.type;
  const errorReason = body.error.reason;

  // Rollover if mapping conflict or illegal argument exceptions
  if (errorType === 'illegal_argument_exception') {
    return true;
  }

  if (errorType === 'mapper_exception') {
    const rolloverReasons = [
      'mapper',
      "can't merge",
      'different type',
      'cannot change',
      'conflicting type',
    ];

    return rolloverReasons.some((reason) =>
      errorReason?.toLowerCase().includes(reason.toLowerCase())
    );
  }

  return false;
}
