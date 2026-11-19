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
  Logger,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  RULE_LIBRARY_DEFINITIONS,
  RULE_LIBRARY_SO_TYPE,
  refreshRuleLibraries,
} from '@kbn/security-rule-libraries';
import type {
  RefreshRuleLibrariesRequestBody,
  RefreshRuleLibrariesResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';

export const refreshRuleLibrariesHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, RefreshRuleLibrariesRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<RefreshRuleLibrariesResponseBody>> => {
  const siemResponse = buildSiemResponse(response);
  const libraryIds = request.body?.library_ids;

  try {
    const unknownId = libraryIds?.find(
      (libraryId) => !RULE_LIBRARY_DEFINITIONS.some(({ id }) => id === libraryId)
    );
    if (unknownId) {
      return siemResponse.error({
        statusCode: 404,
        body: `Rule library "${unknownId}" not found`,
      });
    }

    const ctx = await context.resolve(['core', 'securitySolution']);
    const client = ctx.core.savedObjects.getClient({
      includedHiddenTypes: [RULE_LIBRARY_SO_TYPE],
    });
    const { packages } = ctx.securitySolution.getInternalFleetServices();

    const { results } = await refreshRuleLibraries({ client, packages, logger, libraryIds });

    return response.ok({ body: { results } });
  } catch (err) {
    logger.error(`refreshRuleLibrariesHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
