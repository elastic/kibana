/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import {
  _formatPrivileges,
  hasReadWritePermissions,
} from '../../utils/check_and_format_privileges';
import { getIndexForWatchlist } from '../entities/utils';

export const getUserWatchlistPrivileges = async (
  request: KibanaRequest,
  security: SecurityPluginStart,
  namespace: string
) => {
  const watchlistsIndex = getIndexForWatchlist(namespace);
  const entityStoreIndex = getEntitiesAlias(ENTITY_LATEST, namespace);

  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges, hasAllRequested } = await checkPrivileges({
    elasticsearch: {
      cluster: [],
      index: {
        [watchlistsIndex]: ['read', 'write'],
        [entityStoreIndex]: ['read', 'write'],
      },
    },
  });

  return {
    privileges: _formatPrivileges(privileges),
    has_all_required: hasAllRequested,
    ...hasReadWritePermissions(privileges.elasticsearch, watchlistsIndex),
  };
};
