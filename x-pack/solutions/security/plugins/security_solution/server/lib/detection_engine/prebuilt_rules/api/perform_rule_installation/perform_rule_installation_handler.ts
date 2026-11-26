/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, pick } from 'lodash';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { RULE_LIBRARY_SO_TYPE } from '@kbn/security-rule-libraries';
import type {
  PerformRuleInstallationResponseBody,
  SkippedRuleInstall,
  PerformRuleInstallationRequestBody,
  InstalledRuleBasicInfo,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  SecurityRuleChangeTrackingAction,
  type SecurityRuleChangeTracking,
} from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import {
  aggregatePrebuiltRuleErrors,
  type PrebuiltRulesInstallError,
} from '../../logic/aggregate_prebuilt_rule_errors';
import { PREBUILT_RULES_BULK_CREATE_BATCH_SIZE } from '../../constants';
import { ensureLatestRulesPackageInstalled } from '../../logic/integrations/ensure_latest_rules_package_installed';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { performTimelinesInstallation } from '../../logic/perform_timelines_installation';
import type { RuleSignatureId, RuleVersion } from '../../../../../../common/api/detection_engine';
import { excludeLicenseRestrictedRules } from '../../logic/utils';
import type { BasicRuleInfo } from '../../logic/basic_rule_info';
import { fetchInstalledRuleIds } from '../../logic/fetch_installed_rule_ids';
import { findVisibleRuleLibraries } from '../../logic/rule_libraries/find_visible_rule_libraries';
import {
  resolveAllRuleInstalls,
  resolveSpecificRuleInstalls,
} from '../../logic/resolve_specific_rule_installs';

export const performRuleInstallationHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, PerformRuleInstallationRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient, {
      ruleLibraryEnabled:
        ctx.securitySolution.getConfig().experimentalFeatures.ruleLibrariesEnabled,
    });
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
    const exceptionsListClient = ctx.securitySolution.getExceptionListClient();
    const mlAuthz = ctx.securitySolution.getMlAuthz();

    const { mode } = request.body;

    // This will create the endpoint list if it does not exist yet
    await exceptionsListClient?.createEndpointList();

    // If this API is used directly without hitting any detection engine
    // pages first, the rules package might be missing.
    await ensureLatestRulesPackageInstalled(ruleAssetsClient, ctx.securitySolution, logger);

    const ruleInstallQueue: Array<{
      rule_id: RuleSignatureId;
      version: RuleVersion;
      library_id?: string;
    }> = [];
    const ruleErrors: PrebuiltRulesInstallError[] = [];
    const installedRules: InstalledRuleBasicInfo[] = [];
    const skippedRules: SkippedRuleInstall[] = [];

    // Perform all the checks we can before we start the upgrade process
    if (mode === 'SPECIFIC_RULES') {
      const requestedRuleIds = request.body.rules.map((rule) => rule.rule_id);
      const requestedLibraryIds = [
        ...new Set(request.body.rules.flatMap(({ library_id: id }) => (id ? [id] : []))),
      ];
      const namesEveryLibrary = requestedLibraryIds.length > 0;
      const [latestVersions, installedVersions, visibleLibraries] = await Promise.all([
        ruleAssetsClient.fetchLatestVersions({
          ruleIds: requestedRuleIds,
          // Without this the read only covers the built-in libraries.
          libraryIds: namesEveryLibrary ? requestedLibraryIds : undefined,
        }),
        ruleObjectsClient.fetchInstalledRuleVersionsByIds({ ruleIds: requestedRuleIds }),
        namesEveryLibrary
          ? findVisibleRuleLibraries(
              ctx.core.savedObjects.getClient({ includedHiddenTypes: [RULE_LIBRARY_SO_TYPE] }),
              ctx.securitySolution.getSpaceId()
            )
          : [],
      ]);

      const resolved = resolveSpecificRuleInstalls({
        rules: request.body.rules,
        latestVersions,
        installedRuleIds: new Set(installedVersions.map((version) => version.rule_id)),
        visibleLibraryIds: new Set(visibleLibraries.map(({ id }) => id)),
      });
      ruleInstallQueue.push(...resolved.queue);
      skippedRules.push(...resolved.skipped);
      ruleErrors.push(...resolved.errors);
    } else if (mode === 'ALL_RULES') {
      const libraryId = request.body.library_id;
      let allLatestVersions: BasicRuleInfo[];
      let installedRuleIds: Set<string>;

      if (libraryId) {
        const visibleLibraries = await findVisibleRuleLibraries(
          ctx.core.savedObjects.getClient({ includedHiddenTypes: [RULE_LIBRARY_SO_TYPE] }),
          ctx.securitySolution.getSpaceId()
        );
        const library = visibleLibraries.find(({ id }) => id === libraryId);
        if (!library) {
          return siemResponse.error({
            statusCode: 404,
            body: `Rule library "${libraryId}" not found`,
          });
        }

        // Read a page at a time, and the installed ones a few hundred at a time, so a library with tens of
        // thousands of rules is installed whole.
        allLatestVersions = await ruleAssetsClient.fetchLibraryRuleVersions([
          { id: libraryId, version: library.attributes.version },
        ]);
        installedRuleIds = await fetchInstalledRuleIds(
          ruleObjectsClient,
          allLatestVersions.map(({ rule_id: ruleId }) => ruleId)
        );
      } else {
        allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
        const currentRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
        installedRuleIds = new Set(currentRuleVersions.map((version) => version.rule_id));
      }

      const allInstallableRules = resolveAllRuleInstalls({
        latestVersions: allLatestVersions,
        installedRuleIds,
      });
      ruleInstallQueue.push(...(await excludeLicenseRestrictedRules(allInstallableRules, mlAuthz)));
    }

    const installBatches = chunk(ruleInstallQueue, PREBUILT_RULES_BULK_CREATE_BATCH_SIZE);

    for (const batch of installBatches) {
      const { assets: ruleAssets } = await ruleAssetsClient.fetchAssetsByVersion(batch);

      const changeTracking: SecurityRuleChangeTracking = {
        action: SecurityRuleChangeTrackingAction.ruleInstall,
        metadata: { bulkCount: ruleInstallQueue.length },
      };

      const { results, errors } = await detectionRulesClient.bulkCreatePrebuiltRules({
        rules: ruleAssets,
        changeTracking,
      });

      installedRules.push(...results.map((rule) => pick(rule, ['id', 'rule_id', 'version'])));
      ruleErrors.push(
        ...errors.map(({ item, error }) => ({ item: pick(item, ['rule_id', 'name']), error }))
      );
    }

    const { error: timelineInstallationError } = await performTimelinesInstallation(
      ctx.securitySolution
    );

    const allErrors = aggregatePrebuiltRuleErrors(ruleErrors);
    if (timelineInstallationError) {
      allErrors.push({
        message: timelineInstallationError,
        rules: [],
      });
    }

    const body: PerformRuleInstallationResponseBody = {
      summary: {
        total: installedRules.length + skippedRules.length + ruleErrors.length,
        succeeded: installedRules.length,
        skipped: skippedRules.length,
        failed: ruleErrors.length,
      },
      results: {
        created: installedRules,
        skipped: skippedRules,
      },
      errors: allErrors,
    };

    return response.ok({ body });
  } catch (err) {
    logger.error(`performRuleInstallationHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
