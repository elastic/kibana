/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { MAX_PARAM_VALUE_LENGTH, MAX_ROUTE_ID_LENGTH, routeId } from '../../zod_query';
import { validateRouteSpaceName } from '../../common';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import type { SyntheticsParamRequest, SyntheticsParams } from '../../../../common/runtime_types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';

const RequestParamsSchema = z.strictObject({
  id: routeId,
});

type RequestParams = z.infer<typeof RequestParamsSchema>;

export const editSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsParams | undefined,
  RequestParams
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PARAMS + '/{id}',
  validate: {},
  validation: {
    request: {
      params: RequestParamsSchema,
      body: z.strictObject({
        key: z.string().min(1).max(MAX_ROUTE_ID_LENGTH).optional(),
        value: z.string().min(1).max(MAX_PARAM_VALUE_LENGTH).optional(),
        description: z.string().max(4096).optional(),
        tags: z.array(z.string().max(256)).max(100).optional(),
      }),
    },
  },
  handler: async (routeContext) => {
    const { savedObjectsClient, request, response, spaceId, server } = routeContext;
    const { invalidResponse } = await validateRouteSpaceName(routeContext);
    if (invalidResponse) return invalidResponse;

    const { id: paramId } = request.params;
    const data = request.body as SyntheticsParamRequest;
    if (isEmpty(data)) {
      return response.badRequest({ body: { message: 'Request body cannot be empty' } });
    }
    const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

    try {
      const existingParam =
        await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsParams>(
          syntheticsParamType,
          paramId,
          { namespace: spaceId }
        );

      const newParam = {
        ...existingParam.attributes,
        ...data,
      };

      // value from data since we aren't using encrypted client
      const { value, key: existingKey } = existingParam.attributes;
      const {
        id: responseId,
        attributes: { key, tags, description },
        namespaces,
      } = (await savedObjectsClient.update<SyntheticsParams>(
        syntheticsParamType,
        paramId,
        newParam
      )) as SavedObject<SyntheticsParams>;

      // Include both old and new key if the key was renamed
      const modifiedParamKeys = existingKey !== key ? [existingKey, key] : [key];

      await asyncGlobalParamsPropagation({
        server,
        paramsSpacesToSync: existingParam.namespaces || [spaceId],
        modifiedParamKeys,
      });

      return { id: responseId, key, tags, description, namespaces, value };
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return response.notFound({ body: { message: 'Param not found' } });
      }
    }
  },
});
