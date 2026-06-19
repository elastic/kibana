/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { InstallPrebuiltRulesAndTimelinesResponse } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { ensureLatestRulesPackageInstalled } from '../../logic/integrations/ensure_latest_rules_package_installed';
import { performTimelinesInstallation } from '../../logic/perform_timelines_installation';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { applyPrebuiltRuleAssets } from '../../../rule_management/logic/detection_rules_client/util_methods/apply_prebuilt_rule_assets';
import { getRulesToUpdate } from '../../logic/get_rules_to_update';
import { rulesToMap } from '../../logic/utils';
import { getExistingPrepackagedRules } from '../../../rule_management/logic/search/get_existing_prepackaged_rules';

export class PrepackagedRulesError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * @deprecated This method is incompatible with prebuilt rules customization as
 * it upgrades prebuilt rules to their 'target' version erasing any
 * customizations. Use DetectionRulesClient.installPrebuiltRules instead.
 */
export const legacyCreatePrepackagedRules = async (
  context: SecuritySolutionApiRequestHandlerContext,
  rulesClient: RulesClient,
  actionsClient: ActionsClient,
  logger: Logger,
  exceptionsClient?: ExceptionListClient
): Promise<InstallPrebuiltRulesAndTimelinesResponse> => {
  const savedObjectsClient = context.core.savedObjects.client;
  const siemClient = context.getAppClient();
  const exceptionsListClient = context.getExceptionListClient() ?? exceptionsClient;
  const detectionRulesClient = context.getDetectionRulesClient();
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const mlAuthz = context.getMlAuthz();

  if (!siemClient || !rulesClient) {
    throw new PrepackagedRulesError('', 404);
  }

  // This will create the endpoint list if it does not exist yet
  if (exceptionsListClient != null) {
    await exceptionsListClient.createEndpointList();
  }

  await ensureLatestRulesPackageInstalled(ruleAssetsClient, context, logger);

  const latestPrebuiltRules = await ruleAssetsClient.fetchLatestAssets();
  const installedPrebuiltRules = rulesToMap(
    await getExistingPrepackagedRules({ rulesClient, logger })
  );
  const rulesToUpdate = await getRulesToUpdate(
    latestPrebuiltRules,
    installedPrebuiltRules,
    mlAuthz
  );

  const { installedRules, errors: installErrors } =
    await detectionRulesClient.installAllPrebuiltRules();

  if (installErrors.length > 0) {
    throw new AggregateError(
      installErrors.map((e) => e.error),
      'Error installing new prebuilt rules'
    );
  }

  const { result: timelinesResult } = await performTimelinesInstallation(context);

  const { errors: updateErrors } = await applyPrebuiltRuleAssets({
    assets: rulesToUpdate,
    deps: { actionsClient, rulesClient, mlAuthz, ruleAssetsClient },
  });

  if (updateErrors.length > 0) {
    logger.error(
      `legacyCreatePrepackagedRules: ${updateErrors.length} rule(s) failed to update: ${updateErrors
        .map(({ error }) => (error instanceof Error ? error.message : String(error)))
        .join(', ')}`
    );
  }

  return {
    rules_installed: installedRules.length,
    rules_updated: rulesToUpdate.length,
    timelines_installed: timelinesResult?.timelines_installed ?? 0,
    timelines_updated: timelinesResult?.timelines_updated ?? 0,
  };
};
