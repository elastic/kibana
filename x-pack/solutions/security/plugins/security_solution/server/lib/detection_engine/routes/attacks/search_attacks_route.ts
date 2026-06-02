/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';

import { DETECTION_ENGINE_ATTACKS_SEARCH_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { attacksRouteNotImplemented } from './attacks_route_not_implemented';

export const searchAttacksRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [ALERTS_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      attacksRouteNotImplemented
    );
};
