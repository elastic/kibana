/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksServiceSetup, IKibanaResponse } from '@kbn/core/server';
import { INITIALIZE_SECURITY_SOLUTION } from '@kbn/security-solution-features/constants';
import type { CreateAlertsIndexResponse } from '../../../../../common/api/detection_engine/index_management';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';

/**
 * @deprecated No-op route kept for backwards compatibility. The alerts index is
 * now managed entirely by the rule-registry plugin, so there is nothing to create.
 */
export const createIndexRoute = (
  router: SecuritySolutionPluginRouter,
  docLinks: DocLinksServiceSetup
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_INDEX_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [INITIALIZE_SECURITY_SOLUTION],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
        options: {
          deprecated: {
            // TODO: Add a dedicated doc link for the detection engine index API
            documentationUrl: '',
            severity: 'warning',
            reason: { type: 'remove' },
          },
        },
      },
      async (_, __, response): Promise<IKibanaResponse<CreateAlertsIndexResponse>> => {
        return response.ok({ body: { acknowledged: true } });
      }
    );
};
