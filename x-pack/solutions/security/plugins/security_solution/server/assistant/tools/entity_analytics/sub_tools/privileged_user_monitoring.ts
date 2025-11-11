/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRIVILEGE_MONITORING_ENGINE_STATUS } from '../../../../lib/entity_analytics/privilege_monitoring/constants';
import { PrivilegeMonitoringEngineDescriptorClient } from '../../../../lib/entity_analytics/privilege_monitoring/saved_objects';
import {
  getPrivilegedMonitorUsersIndex,
  getPrivilegedMonitorUsersJoin,
} from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import type { EntityType } from '../../../../../common/search_strategy';
import { EntityTypeEnum } from '../../../../../common/api/entity_analytics';
import type { EntityAnalyticsSubPlugin } from './types';

export const getPrivilegedUserMonitoringSubPlugin: EntityAnalyticsSubPlugin = async (
  entityType: EntityType,
  { spaceId, soClient, logger }
) => {
  const descriptorClient = new PrivilegeMonitoringEngineDescriptorClient({
    soClient,
    namespace: spaceId,
  });

  const engine = await descriptorClient.get();

  if (engine.status === PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED) {
    if (entityType === EntityTypeEnum.user) {
      return {
        message: `This is a set of rules that you must follow strictly:    
    * A user is privileged if the field 'user.is_privileged' is true.
    * When searching the privileged user you must **ALWAYS** filter by: 'where user.name == {identifier}'.
    * The filed entity_analytics_monitoring.labels.value contains information the group in which the privileged user is part of.
    * When querying a different index with user data, you can filter by privileged users using the following ESQL query:
    '${getPrivilegedMonitorUsersJoin(spaceId)}'
    `,
        index: getPrivilegedMonitorUsersIndex(spaceId),
      };
    }
    return {
      message: `We do not have information about 'privileged_user_monitoring' for '${entityType}'.`,
    };
  } else {
    return {
      message: `The privileged user monitoring engine is not enabled in this environment. The current status is: ${engine.status}. The user needs to enable the privileged user monitoring engine se this assistant can answer privileged user related questions.`,
    };
  }
};
