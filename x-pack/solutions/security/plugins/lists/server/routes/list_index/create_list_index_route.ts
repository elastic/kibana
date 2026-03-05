/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIST_INDEX } from '@kbn/securitysolution-list-constants';
import {
  type CreateListIndexResponse,
  CreateListIndexResponse as ResponseSchema,
} from '@kbn/securitysolution-lists-common/api';
import { LISTS_API_ALL } from '@kbn/security-solution-features/constants';

import type { ListsPluginRouter } from '../../types';

export const createListIndexRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: LIST_INDEX,
      security: {
        authz: {
          requiredPrivileges: [LISTS_API_ALL],
        },
      },
    })
    .addVersion(
      {
        validate: false,
        version: '2023-10-31',
        options: {
          deprecated: {
            documentationUrl: '',
            severity: 'warning',
            message:
              'List index creation is now handled automatically by the Security Solution initialization framework via POST /internal/security_solution/initialize.',
            reason: {
              type: 'migrate',
              newApiPath: '/internal/security_solution/initialize',
              newApiMethod: 'POST',
            },
          },
        },
      },
      async (_, __, response) => {
        const body: CreateListIndexResponse = ResponseSchema.parse({ acknowledged: true });
        return response.ok({ body });
      }
    );
};
