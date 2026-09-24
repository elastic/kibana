/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { getLeadsIndexName } from '../../../../common/entity_analytics/lead_generation/constants';
import { _formatPrivileges, hasReadWritePermissions } from '../utils/check_and_format_privileges';

export const getUserLeadPrivileges = async (
  request: KibanaRequest,
  security: SecurityPluginStart,
  spaceId: string
) => {
  const indexName = getLeadsIndexName(spaceId);

  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges, hasAllRequested } = await checkPrivileges({
    elasticsearch: {
      cluster: [],
      index: {
        [indexName]: ['read', 'write'],
      },
    },
  });

  const perms = hasReadWritePermissions(privileges.elasticsearch, indexName);

  return {
    privileges: _formatPrivileges(privileges),
    has_all_required: hasAllRequested,
    has_read_permissions: perms.has_read_permissions,
    has_write_permissions: perms.has_write_permissions,
  };
};
