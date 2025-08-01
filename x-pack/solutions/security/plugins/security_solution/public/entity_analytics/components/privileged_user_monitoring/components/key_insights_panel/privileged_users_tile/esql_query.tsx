/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersIndex } from '../../../../../../../common/entity_analytics/privilege_monitoring/utils';

export const getPrivilegedUsersEsqlCount = (
  namespace: string
) => `FROM ${getPrivilegedMonitorUsersIndex(namespace)}
      | STATS count = COUNT_DISTINCT(user.name)`;
