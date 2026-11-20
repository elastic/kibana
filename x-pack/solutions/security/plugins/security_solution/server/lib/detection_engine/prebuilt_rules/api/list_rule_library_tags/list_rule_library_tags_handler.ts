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
import { RULE_LIBRARY_SO_TYPE } from '@kbn/security-rule-libraries';
import type {
  ListRuleLibraryTagsRequestQuery,
  ListRuleLibraryTagsResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { findVisibleRuleLibraries } from '../../logic/rule_libraries/find_visible_rule_libraries';

export const listRuleLibraryTagsHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, ListRuleLibraryTagsRequestQuery>,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<ListRuleLibraryTagsResponseBody>> => {
  const siemResponse = buildSiemResponse(response);
  const { library_id: libraryId } = request.query;

  try {
    const ctx = await context.resolve(['core', 'securitySolution']);
    const libraries = await findVisibleRuleLibraries(
      ctx.core.savedObjects.getClient({ includedHiddenTypes: [RULE_LIBRARY_SO_TYPE] }),
      ctx.securitySolution.getSpaceId()
    );

    if (libraryId && !libraries.some(({ id }) => id === libraryId)) {
      return siemResponse.error({
        statusCode: 404,
        body: `Rule library "${libraryId}" not found`,
      });
    }

    const tags = await createPrebuiltRuleAssetsClient(ctx.core.savedObjects.client, {
      ruleLibraryEnabled: true,
    }).fetchTagsByLibraries(libraryId ? [libraryId] : libraries.map(({ id }) => id));

    return response.ok({ body: { tags } });
  } catch (err) {
    logger.error(`listRuleLibraryTagsHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
