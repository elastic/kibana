/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  HttpResponsePayload,
  ResponseError,
} from '@kbn/core/server';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/common';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import { ENTITY_ANALYTICS_V2_MODE_API_ERROR } from './translations';

export const withEntityStoreV2Disabled = <P, Q, B, T extends HttpResponsePayload | ResponseError>(
  isRiskScoringMaintainerEnabled: boolean,
  handler: (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest<P, Q, B>,
    response: KibanaResponseFactory
  ) => Promise<IKibanaResponse<T>>
) => {
  return async (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest<P, Q, B>,
    response: KibanaResponseFactory
  ): Promise<IKibanaResponse<T>> => {
    if (isRiskScoringMaintainerEnabled) {
      const core = await context.core;
      const isEntityStoreV2ModeEnabled = await core.uiSettings.client.get<boolean>(
        FF_ENABLE_ENTITY_STORE_V2
      );

      if (!isEntityStoreV2ModeEnabled) {
        return handler(context, request, response);
      }

      const siemResponse = buildSiemResponse(response);
      return siemResponse.error({
        statusCode: 400,
        body: ENTITY_ANALYTICS_V2_MODE_API_ERROR,
      }) as unknown as IKibanaResponse<T>;
    }

    return handler(context, request, response);
  };
};
