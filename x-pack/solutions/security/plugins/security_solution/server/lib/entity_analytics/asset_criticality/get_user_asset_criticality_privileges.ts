/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { checkAndFormatPrivileges } from '../utils/check_and_format_privileges';
import { ASSET_CRITICALITY_REQUIRED_ES_INDEX_PRIVILEGES } from '../../../../common/entity_analytics/asset_criticality';

export const getUserAssetCriticalityPrivileges = async (
  request: KibanaRequest,
  security: SecurityPluginStart
) => {
  return checkAndFormatPrivileges({
    request,
    security,
    privilegesToCheck: {
      elasticsearch: {
        cluster: [],
        index: ASSET_CRITICALITY_REQUIRED_ES_INDEX_PRIVILEGES,
      },
    },
  });
};
