/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersIndex } from '../../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import type { MigratePrivMonDependencies } from './types';

export const deleteUsersWithSourceIndexFactory =
  (deps: Pick<MigratePrivMonDependencies, 'esClient'>) =>
  async (namespace: string): Promise<void> => {
    // Delete all users that don't have the id defined
    await deps.esClient.deleteByQuery({
      index: getPrivilegedMonitorUsersIndex(namespace),
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'labels.source_indices',
              },
            },
          ],
        },
      },
    });
  };
