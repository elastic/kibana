/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { POST_EXCLUDE_INDICES, PRE_EXCLUDE_INDICES } from '../constants';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';
import { PRIVILEGED_MONITOR_IMPORT_USERS_INDEX_MAPPING } from '../engine/elasticsearch/mappings';
import { createIndexSyncService } from './sync/index_sync';

export const createDataSourcesService = (dataClient: PrivilegeMonitoringDataClient) => {
  const esClient = dataClient.deps.clusterClient.asCurrentUser;

  /**
   * This creates an index for the user to populate privileged users.
   * It already defines the mappings and settings for the index.
   */
  const createImportIndex = (indexName: string, mode: 'lookup' | 'standard') => {
    dataClient.log('info', `Creating import index: ${indexName} with mode: ${mode}`);
    // Use the current user client to create the index, the internal user does not have permissions to any index
    return esClient.indices.create({
      index: indexName,
      mappings: { properties: PRIVILEGED_MONITOR_IMPORT_USERS_INDEX_MAPPING },
      settings: {
        mode,
      },
    });
  };

  const searchPrivilegesIndices = async (query: string | undefined) => {
    const { indices, fields } = await esClient.fieldCaps({
      index: [query ? `*${query}*` : '*', ...PRE_EXCLUDE_INDICES],
      types: ['keyword'],
      fields: ['user.name'],
      include_unmapped: true,
      ignore_unavailable: true,
      allow_no_indices: true,
      expand_wildcards: 'open',
      include_empty_fields: true,
      filters: '-parent',
    });

    const indicesWithUserName = fields['user.name']?.keyword?.indices ?? indices;

    if (!Array.isArray(indicesWithUserName) || indicesWithUserName.length === 0) {
      return [];
    }

    return indicesWithUserName.filter(
      (name) => !POST_EXCLUDE_INDICES.some((pattern) => name.startsWith(pattern))
    );
  };

  return {
    createImportIndex,
    searchPrivilegesIndices,
    ...createIndexSyncService(dataClient),
  };
};
