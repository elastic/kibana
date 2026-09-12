/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, ALERTZERO_ACTIONS_URL } from '@kbn/alertzero-common';
import type { ListActionsResponse } from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import {
  InvalidCategoriesError,
  readActionCategoriesQueryParam,
} from './read_categories_query_param';

export const registerListActionsRoute = ({
  router,
  logger,
  getSpaceId,
  getActionsService,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_ACTIONS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'List AlertZero action workflows, optionally filtered by category',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
        },
      },
      async (_context, request, response) => {
        try {
          const categories = readActionCategoriesQueryParam(request);
          const body: ListActionsResponse = await getActionsService().list(
            getSpaceId(request),
            categories
          );
          return response.ok({ body });
        } catch (error) {
          if (error instanceof InvalidCategoriesError) {
            return response.badRequest({ body: { message: error.message } });
          }
          logger.error(`Failed to list actions: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list actions' },
          });
        }
      }
    );
};
