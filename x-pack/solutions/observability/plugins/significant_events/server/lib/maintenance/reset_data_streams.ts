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
  /** Current-user client, used only to delete: `kibana_system` cannot delete these streams. */
  esClient: ElasticsearchClient;
  /**
   * `kibana_system` client for everything else (exists, refresh, count, create), so the
   * caller needs nothing beyond delete privileges on the streams.
   */
  internalEsClient: ElasticsearchClient;
  dataStreams: DataStreamsStart;
  failures: SignificantEventsMaintenanceFailure[];
}

/**
 * Make a registered stream usable: initialise it through Core and create it
 * when missing. Returns false when it could not be made healthy.
 */
const ensureStreamHealthy = async (
  name: string,
  { internalEsClient, dataStreams, failures }: ResetDataStreamsParams
): Promise<boolean> => {
  try {
    await dataStreams.initializeClient(name);
  } catch (error) {
    failures.push({ target: `data-stream:${name}:initialize`, error: toMessage(error) });
    return false;
  }

  let exists = false;
  try {
    exists = await internalEsClient.indices.exists({ index: name });
  } catch (error) {
    failures.push({ target: `data-stream:${name}`, error: toMessage(error) });
    return false;
  }
  if (exists) {
    return true;
  }

  try {
    await internalEsClient.indices.createDataStream({ name });
    return true;
  } catch (error) {
    failures.push({ target: `data-stream:${name}:create`, error: toMessage(error) });
    return false;
  }
};

/** Delete a healthy stream when it holds documents. Returns true when it was deleted. */
const wipeIfPopulated = async (
  name: string,
  { esClient, internalEsClient, failures }: ResetDataStreamsParams
): Promise<boolean> => {
  let documentCount: number | undefined;
  try {
    // `_count` is search-based; refresh first so unrefreshed writes cannot masquerade as empty.
    await internalEsClient.indices.refresh({ index: name });
    documentCount = (await internalEsClient.count({ index: name })).count;
  } catch (error) {
    failures.push({ target: `data-stream:${name}:count`, error: toMessage(error) });
  }
  if (documentCount === 0) {
    return false;
  }

  try {
    await esClient.indices.deleteDataStream({ name }, { ignore: [404] });
    return true;
  } catch (error) {
    failures.push({ target: `data-stream:${name}:delete`, error: toMessage(error) });
    return false;
  }
};

/**
 * Reset a registered stream: make it healthy, wipe it when populated, then
 * make it healthy again so cached clients stay readable. An empty stream is
 * left untouched so a repeated reset is a no-op. Returns true when the stream
 * was deleted.
 */
const resetRegisteredDataStream = async (
  name: string,
  params: ResetDataStreamsParams
): Promise<boolean> => {
  if (!(await ensureStreamHealthy(name, params))) {
    return false;
  }
  if (!(await wipeIfPopulated(name, params))) {
    return false;
  }
  await ensureStreamHealthy(name, params);
  return true;
};

/** Delete the discoveries stream outright; its owning workflow recreates it. Returns true when deleted. */
const deleteDiscoveriesDataStream = async ({
  esClient,
  internalEsClient,
  failures,
}: ResetDataStreamsParams): Promise<boolean> => {
  try {
    if (!(await internalEsClient.indices.exists({ index: DISCOVERIES_DATA_STREAM }))) {
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

/** Wipe every Significant Events data stream; returns the names of streams whose data was deleted. */
export const resetDataStreams = async (params: ResetDataStreamsParams): Promise<Set<string>> => {
  const deleted = new Set<string>();
  for (const name of RESET_REGISTERED_DATA_STREAMS) {
    if (await resetRegisteredDataStream(name, params)) {
      deleted.add(name);
    }
  }
  if (await deleteDiscoveriesDataStream(params)) {
    deleted.add(DISCOVERIES_DATA_STREAM);
  }
  return deleted;
};
