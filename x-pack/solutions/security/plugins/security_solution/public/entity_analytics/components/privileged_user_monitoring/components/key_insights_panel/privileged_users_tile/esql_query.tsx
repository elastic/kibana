/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersIndex } from '../../../../../../../common/entity_analytics/privileged_user_monitoring/utils';

export const getPrivilegedUsersEsqlCount = (
  namespace: string
) => `FROM ${getPrivilegedMonitorUsersIndex(namespace)}
      | WHERE user.is_privileged == true
      | STATS count = COUNT(*)`;
