/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_SCAN_FAILURES_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

export const registerGetScanFailuresRoute = ({
  router,
  getSpaceId,
  getScanFailuresService,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_SCAN_FAILURES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'List AlertZero workers with a failed scan in the last 24 hours',
      description:
        'Returns distinct Workers whose managed workflows finished failed in the trailing 24 hours. Query failures return an empty list.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
        },
      },
      withAlertZeroEnabled(async (_context, request, response) => {
        const body = await getScanFailuresService().list(request, getSpaceId(request));
        return response.ok({ body });
      })
    );
};
