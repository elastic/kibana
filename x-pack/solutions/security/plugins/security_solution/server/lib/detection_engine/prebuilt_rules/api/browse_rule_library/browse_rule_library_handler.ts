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
  BrowseRuleLibraryRequestBody,
  BrowseRuleLibraryResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { browseRuleLibrary } from '../../logic/browse_rule_library';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { findVisibleRuleLibraries } from '../../logic/rule_libraries/find_visible_rule_libraries';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';

export const browseRuleLibraryHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, BrowseRuleLibraryRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<BrowseRuleLibraryResponseBody>> => {
  const siemResponse = buildSiemResponse(response);
  const {
    library_id: libraryId,
    search,
    tags,
    tactics,
    sort,
    page,
    per_page: perPage,
  } = request.body;

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const libraryClient = ctx.core.savedObjects.getClient({
      includedHiddenTypes: [RULE_LIBRARY_SO_TYPE],
    });
    const libraries = await findVisibleRuleLibraries(
      libraryClient,
      ctx.securitySolution.getSpaceId()
    );

    if (libraryId && !libraries.some(({ id }) => id === libraryId)) {
      return siemResponse.error({
        statusCode: 404,
        body: `Rule library "${libraryId}" not found`,
      });
    }

    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

    const body = await browseRuleLibrary({
      ruleAssetsClient: createPrebuiltRuleAssetsClient(ctx.core.savedObjects.client, {
        ruleLibraryEnabled: true,
      }),
      fetchInstalledRuleVersions: (ruleIds) =>
        ruleObjectsClient.fetchInstalledRuleVersionsByIds({ ruleIds }),
      libraryTitles: new Map(libraries.map(({ id, attributes }) => [id, attributes.title])),
      libraries: libraries
        .filter(({ id }) => !libraryId || id === libraryId)
        .map(({ id, attributes }) => ({ id, version: attributes.version })),
      search,
      tags,
      tactics,
      sort,
      page,
      perPage,
    });

    return response.ok({ body });
  } catch (err) {
    logger.error(`browseRuleLibraryHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
