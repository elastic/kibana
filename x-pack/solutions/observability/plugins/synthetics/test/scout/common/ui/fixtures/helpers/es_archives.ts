/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout-oblt';

// Data streams shipped by the `synthetics_data` archive.
const ARCHIVED_DATA_STREAMS = [
  'synthetics-browser-default',
  'synthetics-browser.network-default',
  'synthetics-browser.screenshot-default',
];

/**
 * Deletes the data streams owned by the `synthetics_data` archive so that a following
 * `esArchiver.loadIfNeeded` actually ingests them.
 *
 * `loadIfNeeded` skips every document of a data stream that already exists, and other Scout
 * configs sharing the same cluster (all configs of a CI lane run against one server) index
 * their own browser documents into these data streams. Without this reset, the archive is
 * silently skipped and specs asserting on archived data read an empty data stream — for
 * example step metrics reporting `0 Bytes` of transfer size.
 */
export const resetArchivedSyntheticsDataStreams = async (
  esClient: EsClient,
  log: ScoutLogger
): Promise<void> => {
  log.debug(`[setup] deleting archived data streams: ${ARCHIVED_DATA_STREAMS.join(', ')}`);
  await esClient.indices.deleteDataStream(
    { name: ARCHIVED_DATA_STREAMS.join(',') },
    { ignore: [404] }
  );
};
