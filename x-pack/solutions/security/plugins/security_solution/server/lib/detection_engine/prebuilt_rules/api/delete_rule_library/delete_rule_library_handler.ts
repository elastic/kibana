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
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RULE_LIBRARY_DEFINITIONS, RULE_LIBRARY_SO_TYPE } from '@kbn/security-rule-libraries';
import type {
  DeleteRuleLibraryRequestParams,
  DeleteRuleLibraryRequestQuery,
  DeleteRuleLibraryResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import {
  deleteRuleLibraryAssets,
  toAssetVersionKey,
} from '../../logic/rule_libraries/delete_rule_library_assets';
import { findVisibleRuleLibraries } from '../../logic/rule_libraries/find_visible_rule_libraries';

// The rule versions that the rules installed in the current space are on.
const getInstalledVersionKeys = async (
  rulesClient: RulesClient,
  libraryId: string
): Promise<Set<string>> => {
  const installedRules = await createPrebuiltRuleObjectsClient(
    rulesClient
  ).fetchInstalledRuleVersions();
  return new Set(
    installedRules
      .filter((rule) => rule.library_id === libraryId)
      .map(({ rule_id: ruleId, version }) => toAssetVersionKey(ruleId, version))
  );
};

export const deleteRuleLibraryHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<DeleteRuleLibraryRequestParams, DeleteRuleLibraryRequestQuery>,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<DeleteRuleLibraryResponseBody>> => {
  const siemResponse = buildSiemResponse(response);
  const { library_id: libraryId } = request.params;
  const { keep_rule_versions: keepRuleVersions } = request.query;

  try {
    if (RULE_LIBRARY_DEFINITIONS.some(({ id }) => id === libraryId)) {
      return siemResponse.error({
        statusCode: 400,
        body: 'Built-in rule libraries cannot be removed',
      });
    }

    const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
    const client = ctx.core.savedObjects.getClient({
      includedHiddenTypes: [RULE_LIBRARY_SO_TYPE],
    });

    const visibleLibraries = await findVisibleRuleLibraries(
      client,
      ctx.securitySolution.getSpaceId()
    );
    const library = visibleLibraries.find(({ id }) => id === libraryId);
    if (!library) {
      return siemResponse.error({
        statusCode: 404,
        body: `Rule library "${libraryId}" not found`,
      });
    }

    // A space library is only installed from in its own space, so the versions in use there are all
    // there are to spare. Other libraries can be installed from in any space, which is not looked at,
    // so the caller decides whether to keep every version.
    const isSpaceLibrary = Boolean(library.attributes.space_id);
    const versionsToKeep = isSpaceLibrary
      ? await getInstalledVersionKeys(await ctx.alerting.getRulesClient(), libraryId)
      : new Set<string>();

    // Assets go first, so a failure half way leaves a library that can be removed again.
    const deletedAssets =
      keepRuleVersions && !isSpaceLibrary
        ? 0
        : await deleteRuleLibraryAssets(client, libraryId, versionsToKeep);
    await client.delete(RULE_LIBRARY_SO_TYPE, libraryId);

    return response.ok({ body: { id: libraryId, deleted_assets: deletedAssets } });
  } catch (err) {
    logger.error(`deleteRuleLibraryHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
