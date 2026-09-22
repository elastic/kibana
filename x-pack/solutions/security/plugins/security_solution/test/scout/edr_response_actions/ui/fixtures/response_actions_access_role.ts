/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { getWithResponseActionsRole } from '../../../../../scripts/endpoint/common/roles_users/with_response_actions_role';

/**
 * Same privileges as the Cypress `endpoint_response_actions_access` user.
 * That role is not in Scout's roles file, so tests pass the descriptor to
 * `loginWithCustomRole`.
 */
export const getResponseActionsAccessRole = (): KibanaRole => {
  const role = getWithResponseActionsRole();

  return {
    elasticsearch: {
      cluster: [...(role.elasticsearch.cluster ?? [])],
      indices: role.elasticsearch.indices?.map(({ names, privileges }) => ({
        names: [...names],
        privileges: [...privileges],
      })),
    },
    kibana: role.kibana.map(({ base, feature, spaces }) => ({
      base: [...base],
      feature: Object.fromEntries(
        Object.entries(feature).map(([featureName, privileges]) => [featureName, [...privileges]])
      ),
      spaces: [...spaces],
    })),
  };
};
