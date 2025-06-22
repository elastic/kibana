/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';

import { ALERT_ATTACK_DISCOVERY_USERS } from '../schedules/fields';

export const getUpdateAttackDiscoveryAlertsQuery = ({
  authenticatedUser,
  ids,
  indexPattern,
  kibanaAlertWorkflowStatus,
  visibility,
}: {
  authenticatedUser: AuthenticatedUser;
  ids: string[];
  indexPattern: string;
  kibanaAlertWorkflowStatus?: 'acknowledged' | 'closed' | 'open';
  visibility?: 'not_shared' | 'shared';
}): estypes.UpdateByQueryRequest => ({
  allow_no_indices: true,
  conflicts: 'proceed',
  ignore_unavailable: true,
  index: [indexPattern],
  query: {
    ids: {
      values: ids,
    },
  },
  script: {
    source: `
      if (params.kibanaAlertWorkflowStatus != null) {
        ctx._source['${ALERT_WORKFLOW_STATUS}'] = params.kibanaAlertWorkflowStatus;
      }

    if (params.visibility == 'not_shared') {
      ctx._source['${ALERT_ATTACK_DISCOVERY_USERS}'] = new ArrayList();

      Map user = new HashMap();
      user.put('id', params.authenticatedUser.profile_uid);
      user.put('name', params.authenticatedUser.username);

      ctx._source['${ALERT_ATTACK_DISCOVERY_USERS}'].add(user);
    } else if (params.visibility == 'shared') {
      ctx._source['${ALERT_ATTACK_DISCOVERY_USERS}'] = new ArrayList();
    }
    `,
    params: {
      authenticatedUser: {
        profile_uid: authenticatedUser.profile_uid,
        username: authenticatedUser.username,
      },
      kibanaAlertWorkflowStatus,
      visibility,
    },
  },
});
