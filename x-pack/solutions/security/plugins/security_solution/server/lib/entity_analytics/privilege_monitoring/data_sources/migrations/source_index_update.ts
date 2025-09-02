/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersIndex } from '../../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import type { MigratePrivMonDependencies } from './types';

export const migrateSourceIndexFactory =
  (deps: MigratePrivMonDependencies) =>
  async (namespace: string, indexPattern: string | undefined, sourceId: string): Promise<void> => {
    // script that deletes the source_indices field and adds source_ids
    const PAINLESS_SCRIPT = `
      if (ctx._source.labels != null) {
        ctx._source.labels.remove('source_indices');
        ctx._source.labels.source_ids = [];
        ctx._source.labels.source_ids.add(params.source_id);
      }
`;

    await deps.esClient.updateByQuery(
      {
        index: getPrivilegedMonitorUsersIndex(namespace),
        conflicts: 'proceed',
        ignore_unavailable: true,
        allow_no_indices: true,
        refresh: true,
        scroll_size: 10000,
        query: {
          bool: {
            must: [
              {
                exists: {
                  field: 'labels.source_indices',
                },
              },
              { term: { 'labels.sources': 'index' } },
              { term: { 'labels.source_indices.keyword': indexPattern } },
            ],
          },
        },
        script: {
          source: PAINLESS_SCRIPT,
          lang: 'painless',
          params: {
            source_id: sourceId,
          },
        },
      },
      {
        requestTimeout: '5m',
        retryOnTimeout: true,
        maxRetries: 2,
      }
    );
  };
