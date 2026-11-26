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
  GetRuleLibraryRuleRequestQuery,
  GetRuleLibraryRuleResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { getRuleLibraryInstallInfo } from '../../logic/browse_rule_library';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { findVisibleRuleLibraries } from '../../logic/rule_libraries/find_visible_rule_libraries';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';

export const getRuleLibraryRuleHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, GetRuleLibraryRuleRequestQuery>,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<GetRuleLibraryRuleResponseBody>> => {
  const siemResponse = buildSiemResponse(response);
  const { library_id: libraryId, rule_id: ruleId } = request.query;

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const libraries = await findVisibleRuleLibraries(
      ctx.core.savedObjects.getClient({ includedHiddenTypes: [RULE_LIBRARY_SO_TYPE] }),
      ctx.securitySolution.getSpaceId()
    );

    if (!libraries.some(({ id }) => id === libraryId)) {
      return siemResponse.error({
        statusCode: 404,
        body: `Rule library "${libraryId}" not found`,
      });
    }

    const ruleAssetsClient = createPrebuiltRuleAssetsClient(ctx.core.savedObjects.client, {
      ruleLibraryEnabled: true,
    });
    const [latest] = await ruleAssetsClient.fetchLatestVersions({
      ruleIds: [ruleId],
      libraryIds: [libraryId],
    });
    const { assets } = latest
      ? await ruleAssetsClient.fetchAssetsByVersion([latest], { libraryIds: [libraryId] })
      : { assets: [] };

    if (assets.length === 0) {
      return siemResponse.error({
        statusCode: 404,
        body: `Rule "${ruleId}" not found in library "${libraryId}"`,
      });
    }

    const rulesClient = await ctx.alerting.getRulesClient();
    const [installed] = await createPrebuiltRuleObjectsClient(
      rulesClient
    ).fetchInstalledRuleVersionsByIds({ ruleIds: [ruleId] });

    return response.ok({
      body: {
        rule: convertPrebuiltRuleAssetToRuleResponse(assets[0]),
        ...getRuleLibraryInstallInfo(
          libraryId,
          installed,
          new Map(libraries.map(({ id, attributes }) => [id, attributes.title]))
        ),
      },
    });
  } catch (err) {
    logger.error(`getRuleLibraryRuleHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
