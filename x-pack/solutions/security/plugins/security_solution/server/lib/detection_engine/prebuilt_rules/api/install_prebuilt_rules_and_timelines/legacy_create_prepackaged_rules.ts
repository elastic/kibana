/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { InstallPrebuiltRulesAndTimelinesResponse } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { getExistingPrepackagedRules } from '../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { ensureLatestRulesPackageInstalled } from '../../logic/integrations/ensure_latest_rules_package_installed';
import { getRulesToInstall } from '../../logic/get_rules_to_install';
import { getRulesToUpdate } from '../../logic/get_rules_to_update';
import { performTimelinesInstallation } from '../../logic/perform_timelines_installation';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRules } from '../../logic/rule_objects/create_prebuilt_rules';
import { upgradePrebuiltRules } from '../../logic/rule_objects/upgrade_prebuilt_rules';
import { rulesToMap } from '../../logic/utils';

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
 * customizations. Use createPrebuiltRules instead.
 */
export const legacyCreatePrepackagedRules = async (
  context: SecuritySolutionApiRequestHandlerContext,
  rulesClient: RulesClient,
  exceptionsClient?: ExceptionListClient
): Promise<InstallPrebuiltRulesAndTimelinesResponse> => {
  const savedObjectsClient = context.core.savedObjects.client;
  const siemClient = context.getAppClient();
  const exceptionsListClient = context.getExceptionListClient() ?? exceptionsClient;
  const detectionRulesClient = context.getDetectionRulesClient();
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);

  if (!siemClient || !rulesClient) {
    throw new PrepackagedRulesError('', 404);
  }

  // This will create the endpoint list if it does not exist yet
  if (exceptionsListClient != null) {
    await exceptionsListClient.createEndpointList();
  }

  const latestPrebuiltRules = await ensureLatestRulesPackageInstalled(ruleAssetsClient, context);

  const installedPrebuiltRules = rulesToMap(await getExistingPrepackagedRules({ rulesClient }));
  const rulesToInstall = getRulesToInstall(latestPrebuiltRules, installedPrebuiltRules);
  const rulesToUpdate = getRulesToUpdate(latestPrebuiltRules, installedPrebuiltRules);

  const result = await createPrebuiltRules(detectionRulesClient, rulesToInstall);
  if (result.errors.length > 0) {
    throw new AggregateError(result.errors, 'Error installing new prebuilt rules');
  }

  const { result: timelinesResult } = await performTimelinesInstallation(context);

  await upgradePrebuiltRules(detectionRulesClient, rulesToUpdate);

  return {
    rules_installed: rulesToInstall.length,
    rules_updated: rulesToUpdate.length,
    timelines_installed: timelinesResult?.timelines_installed ?? 0,
    timelines_updated: timelinesResult?.timelines_updated ?? 0,
  };
};
