/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { getPrivilegeUserMonitoringRequiredEsIndexPrivileges } from '../../../../common/entity_analytics/privilege_monitoring/utils';
import { checkAndFormatPrivileges } from '../utils/check_and_format_privileges';

export const getReadPrivilegeUserMonitoringPrivileges = async (
  request: KibanaRequest,
  security: SecurityPluginStart,
  namespace: string
) => {
  return checkAndFormatPrivileges({
    request,
    security,
    privilegesToCheck: {
      elasticsearch: {
        cluster: [],
        index: getPrivilegeUserMonitoringRequiredEsIndexPrivileges(namespace),
      },
    },
  });
};
