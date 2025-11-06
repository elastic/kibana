/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getPrivilegedMonitorUsersIndex,
  getPrivilegedMonitorUsersJoin,
} from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import type { EntityType } from '../../../../../common/search_strategy';
import { EntityTypeEnum } from '../../../../../common/api/entity_analytics';
import type { EntityAnalyticsSubPlugin } from './types';

export const getPrivilegedUserMonitoringSubPlugin: EntityAnalyticsSubPlugin = async (
  entityType: EntityType,
  { spaceId }
) => {
  if (entityType === EntityTypeEnum.user) {
    return `This is a set of rules that you must follow strictly:
    * Use the privileged user monitoring index pattern: ${getPrivilegedMonitorUsersIndex(spaceId)}.
    * A user is privileged if the field 'user.is_privileged' is true.
    * When searching the privileged user you must **ALWAYS** filter by: 'where user.name == {identifier}'.
    * The filed entity_analytics_monitoring.labels.value contains information the group in which the privileged user is part of.
    * When querying a different index with user data, you can filter by privileged users using the following ESQL query:
    '${getPrivilegedMonitorUsersJoin(spaceId)}'
    `;
  }
  return `We do not have information about 'privileged_user_monitoring' for '${entityType}'.`;
};
