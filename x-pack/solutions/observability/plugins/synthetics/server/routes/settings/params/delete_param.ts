/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { DeleteParamsResponse } from '../../../../common/runtime_types';

export const deleteSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  { id?: string },
  unknown,
  { ids: string[] }
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.PARAMS + '/{id?}',
  validate: {},
  validation: {
    request: {
      body: schema.nullable(
        schema.object({
          ids: schema.arrayOf(schema.string(), {
            minSize: 1,
          }),
        })
      ),
      params: schema.object({
        id: schema.maybe(schema.string()),
      }),
    },
  },
  handler: async ({ savedObjectsClient, request, response }) => {
    const { ids } = request.body ?? {};
    const { id: paramId } = request.params ?? {};

    if (ids && paramId) {
      return response.badRequest({
        body: i18n.translate('xpack.synthetics.deleteParam.errorMultipleIdsProvided', {
          defaultMessage: `Both param id  and body parameters cannot be provided`,
        }),
      });
    }

    const idsToDelete = ids ?? [paramId];

    if (idsToDelete.length === 0) {
      return response.badRequest({
        body: i18n.translate('xpack.synthetics.deleteParam.errorNoIdsProvided', {
          defaultMessage: `No param ids provided`,
        }),
      });
    }

    const result = await savedObjectsClient.bulkDelete(
      idsToDelete.map((id) => ({ type: syntheticsParamType, id })),
      { force: true }
    );
    return result.statuses.map(({ id, success }) => ({ id, deleted: success }));
  },
});
