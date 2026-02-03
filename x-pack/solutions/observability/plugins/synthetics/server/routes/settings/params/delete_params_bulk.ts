/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getExistingParamsSpaces } from './delete_param';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { DeleteParamsResponse } from '../../../../common/runtime_types';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';

export const deleteSyntheticsParamsBulkRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  unknown,
  unknown,
  { ids: string[] }
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.PARAMS + '/_bulk_delete',
  validate: {},
  validation: {
    request: {
      body: schema.object({
        ids: schema.arrayOf(schema.string()),
      }),
    },
  },
  handler: async ({ savedObjectsClient, request, server, spaceId }) => {
    const { ids } = request.body;

    const existingParamsSpaces = await getExistingParamsSpaces(savedObjectsClient, ids);

    const result = await savedObjectsClient.bulkDelete(
      ids.map((id) => ({ type: syntheticsParamType, id })),
      { force: true }
    );

    await asyncGlobalParamsPropagation({
      server,
      paramsSpacesToSync: existingParamsSpaces,
    });

    return result.statuses.map(({ id, success }) => ({ id, deleted: success }));
  },
});
