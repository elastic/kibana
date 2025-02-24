/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import {} from '../..';

import {
  CONNECTORS_JOBS_INDEX,
  ConnectorSyncJobDocument,
  fetchConnectorByIndexName,
  SyncStatus,
} from '@kbn/search-connectors';

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../common/constants';
import { ElasticsearchIndexWithIngestion } from '../../../common/types/indices';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

import { mapIndexStats } from './utils/map_index_stats';

const hasInProgressSyncs = async (
  client: IScopedClusterClient,
  connectorId: string
): Promise<{ inProgress: boolean; pending: boolean }> => {
  try {
    const syncs = await client.asCurrentUser.search<ConnectorSyncJobDocument>({
      index: CONNECTORS_JOBS_INDEX,
      query: {
        bool: {
          filter: [
            { term: { 'connector.id': connectorId } },
            {
              dis_max: {
                queries: [
                  { term: { status: SyncStatus.IN_PROGRESS } },
                  { term: { status: SyncStatus.PENDING } },
                ],
              },
            },
          ],
        },
      },
    });
    const inProgress = syncs.hits.hits.some(
      (sync) => sync._source?.status === SyncStatus.IN_PROGRESS
    );
    const pending = syncs.hits.hits.some((sync) => sync._source?.status === SyncStatus.PENDING);
    return { inProgress, pending };
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return { inProgress: false, pending: false };
    }
    throw error;
  }
};

export const fetchIndex = async (
  client: IScopedClusterClient,
  index: string
): Promise<ElasticsearchIndexWithIngestion> => {
  const indexDataResult = await client.asCurrentUser.indices.get({ index });
  const indexData = indexDataResult[index];
  const { indices } = await client.asCurrentUser.indices.stats({ index });

  const { count } = await client.asCurrentUser.count({ index });

  if (!indices || !indices[index] || !indexData) {
    throw new Error('404');
  }
  const indexStats = indices[index];

  const connector = await fetchConnectorByIndexName(client.asCurrentUser, index);
  const hasInProgressSyncsResult = connector
    ? await hasInProgressSyncs(client, connector.id)
    : { inProgress: false, pending: false };

  const indexResult = {
    count,
    ...mapIndexStats(indexData, indexStats, index),
    has_in_progress_syncs: hasInProgressSyncsResult.inProgress,
    has_pending_syncs: hasInProgressSyncsResult.pending,
  };

  if (connector && connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE) {
    return {
      ...indexResult,
      connector,
    };
  }

  return indexResult;
};
