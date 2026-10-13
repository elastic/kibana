/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import { MAX_PARAM_BULK_SIZE, routeId } from '../../zod_query';
import type { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { DeleteParamsResponse, SyntheticsParams } from '../../../../common/runtime_types';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';

const deleteParams = async (
  { savedObjectsClient, server }: RouteContext,
  idsToDelete: string[]
): Promise<DeleteParamsResponse[]> => {
  const { spaces: existingParamsSpaces, keys: modifiedParamKeys } = await getExistingParamsInfo(
    savedObjectsClient,
    idsToDelete
  );

  const result = await savedObjectsClient.bulkDelete(
    idsToDelete.map((id) => ({ type: syntheticsParamType, id })),
    { force: true }
  );
  await asyncGlobalParamsPropagation({
    server,
    paramsSpacesToSync: existingParamsSpaces,
    modifiedParamKeys,
  });

  return result.statuses.map(({ id, success }) => ({ id, deleted: success }));
};

export const deleteSyntheticsParamRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  { id: string }
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.PARAMS + '/{id}',
  validate: {},
  validation: {
    request: {
      params: z.strictObject({
        id: routeId,
      }),
    },
  },
  handler: async (routeContext) => deleteParams(routeContext, [routeContext.request.params.id]),
});

/** Superseded by `POST /params/_bulk_delete`; kept for existing clients. */
export const deleteSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  Record<string, string>,
  Record<string, string>,
  { ids: string[] }
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {},
  validation: {
    request: {
      body: z.strictObject({
        ids: z.array(routeId).min(1).max(MAX_PARAM_BULK_SIZE),
      }),
    },
  },
  handler: async (routeContext) => deleteParams(routeContext, routeContext.request.body.ids),
});

export async function getExistingParamsInfo(
  savedObjectsClient: SavedObjectsClientContract,
  paramIds: string[]
) {
  const existingParam = await savedObjectsClient.bulkGet<SyntheticsParams>(
    paramIds.map((id) => ({ type: syntheticsParamType, id }))
  );

  const spaces = Array.from(
    new Set(
      existingParam.saved_objects.reduce((acc, obj) => {
        return acc.concat(isSavedObjectErrorResult(obj) ? [] : obj.namespaces ?? []);
      }, [] as string[])
    )
  );

  const keys = existingParam.saved_objects
    .filter(
      (obj): obj is SavedObject<SyntheticsParams> =>
        !isSavedObjectErrorResult(obj) && !!obj.attributes?.key
    )
    .map((obj) => obj.attributes.key);

  return { spaces, keys };
}
