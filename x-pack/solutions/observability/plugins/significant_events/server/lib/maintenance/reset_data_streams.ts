/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators/data_stream';
import { DETECTIONS_DATA_STREAM } from '../significant_events/detections/data_stream';
import { DISCOVERIES_DATA_STREAM } from '../significant_events/discoveries_data_stream';
import { EVENTS_DATA_STREAM } from '../significant_events/events/data_stream';
import { toMessage } from './to_message';

/** Core-registered streams that Reset wipes and recreates so cached clients stay readable. */
export const RESET_REGISTERED_DATA_STREAMS = [
  DETECTIONS_DATA_STREAM,
  EVENTS_DATA_STREAM,
  KNOWLEDGE_INDICATORS_DATA_STREAM,
] as const;

interface ResetDataStreamsParams {
  /** Current-user client: `kibana_system` can initialize these streams but cannot delete them. */
  esClient: ElasticsearchClient;
  dataStreams: DataStreamsStart;
  failures: SignificantEventsMaintenanceFailure[];
}

/**
 * Wipe a registered stream by deleting and recreating it, leaving an empty
 * stream untouched so a repeated reset is a no-op. Returns true when documents
 * were deleted.
 */
const resetRegisteredDataStream = async (
  name: string,
  { esClient, dataStreams, failures }: ResetDataStreamsParams
): Promise<boolean> => {
  try {
    await dataStreams.initializeClient(name);
  } catch (error) {
    failures.push({ target: `data-stream:${name}:initialize`, error: toMessage(error) });
  }

  let exists = false;
  try {
    exists = await esClient.indices.exists({ index: name });
  } catch (error) {
    failures.push({ target: `data-stream:${name}`, error: toMessage(error) });
    return false;
  }

  const createDataStream = async (): Promise<void> => {
    try {
      await esClient.indices.createDataStream({ name });
    } catch (error) {
      failures.push({ target: `data-stream:${name}:create`, error: toMessage(error) });
    }
  };

  if (!exists) {
    await createDataStream();
    return false;
  }

  let documentCount: number | undefined;
  try {
    documentCount = (await esClient.count({ index: name })).count;
  } catch (error) {
    failures.push({ target: `data-stream:${name}:count`, error: toMessage(error) });
  }
  if (documentCount === 0) {
    return false;
  }

  try {
    await esClient.indices.deleteDataStream({ name }, { ignore: [404] });
  } catch (error) {
    failures.push({ target: `data-stream:${name}:delete`, error: toMessage(error) });
    return false;
  }
  await createDataStream();
  return documentCount !== undefined;
};

/** Delete the discoveries stream outright; its owning workflow recreates it. Returns true when deleted. */
const deleteDiscoveriesDataStream = async ({
  esClient,
  failures,
}: ResetDataStreamsParams): Promise<boolean> => {
  try {
    if (!(await esClient.indices.exists({ index: DISCOVERIES_DATA_STREAM }))) {
      return false;
    }
    await esClient.indices.deleteDataStream({ name: DISCOVERIES_DATA_STREAM }, { ignore: [404] });
    return true;
  } catch (error) {
    failures.push({
      target: `data-stream:${DISCOVERIES_DATA_STREAM}:delete`,
      error: toMessage(error),
    });
    return false;
  }
};

/** Wipe every Significant Events data stream; returns how many held data that was deleted. */
export const resetDataStreams = async (params: ResetDataStreamsParams): Promise<number> => {
  let deleted = 0;
  for (const name of RESET_REGISTERED_DATA_STREAMS) {
    if (await resetRegisteredDataStream(name, params)) {
      deleted += 1;
    }
  }
  if (await deleteDiscoveriesDataStream(params)) {
    deleted += 1;
  }
  return deleted;
};
