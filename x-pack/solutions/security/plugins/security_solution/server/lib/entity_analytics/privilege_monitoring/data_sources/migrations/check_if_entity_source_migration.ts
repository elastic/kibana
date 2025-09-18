/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersIndex } from '../../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import type { MigratePrivMonDependencies } from './types';

export const shouldRunSourceMigrationFactory =
  (deps: Pick<MigratePrivMonDependencies, 'esClient'>) =>
  async (namespace: string): Promise<boolean> => {
    const response = await deps.esClient.count({
      index: getPrivilegedMonitorUsersIndex(namespace),
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'labels.source_indices', // find users that have the source_indices field
              },
            },
          ],
        },
      },
    });

    return response.count > 0;
  };
