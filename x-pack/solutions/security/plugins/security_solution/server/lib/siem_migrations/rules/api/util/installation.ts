/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { UpdateRuleMigrationData } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { initPromisePool } from '../../../../../utils/promise_pool';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../..';
import { performTimelinesInstallation } from '../../../../detection_engine/prebuilt_rules/logic/perform_timelines_installation';
import { createPrebuiltRules } from '../../../../detection_engine/prebuilt_rules/logic/rule_objects/create_prebuilt_rules';
import type { IDetectionRulesClient } from '../../../../detection_engine/rule_management/logic/detection_rules_client/detection_rules_client_interface';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import type { StoredRuleMigration } from '../../types';
import { getPrebuiltRules, getUniquePrebuiltRuleIds } from './prebuilt_rules';
import {
  convertMigrationCustomRuleToSecurityRulePayload,
  isMigrationCustomRule,
} from '../../../../../../common/siem_migrations/rules/utils';
import { getAllMigrationRules } from './get_all_rules';

const MAX_CUSTOM_RULES_TO_CREATE_IN_PARALLEL = 50;

const installPrebuiltRules = async (
  rulesToInstall: StoredRuleMigration[],
  enabled: boolean,
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext,
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  detectionRulesClient: IDetectionRulesClient
): Promise<UpdateRuleMigrationData[]> => {
  // Get required prebuilt rules
  const prebuiltRulesIds = getUniquePrebuiltRuleIds(rulesToInstall);
  const prebuiltRules = await getPrebuiltRules(rulesClient, savedObjectsClient, prebuiltRulesIds);

  const { installed: alreadyInstalledRules, installable } = Object.values(prebuiltRules).reduce(
    (acc, item) => {
      if (item.current) {
        acc.installed.push(item.current);
      } else {
        acc.installable.push({ ...item.target, enabled });
      }
      return acc;
    },
    { installed: [], installable: [] } as {
      installed: RuleResponse[];
      installable: RuleResponse[];
    }
  );

  // Install prebuilt rules
  const { results: newlyInstalledRules, errors: installPrebuiltRulesErrors } =
    await createPrebuiltRules(detectionRulesClient, installable);
  if (installPrebuiltRulesErrors.length > 0) {
    throw new AggregateError(installPrebuiltRulesErrors, 'Error installing prebuilt rules');
  }

  const { error: installTimelinesErrors } = await performTimelinesInstallation(
    securitySolutionContext
  );
  if (installTimelinesErrors?.length) {
    throw new AggregateError(installTimelinesErrors, 'Error installing prepackaged timelines');
  }

  const installedRules = [
    ...alreadyInstalledRules,
    ...newlyInstalledRules.map((value) => value.result),
  ];

  // Create migration rules updates templates
  const rulesToUpdate: UpdateRuleMigrationData[] = [];
  installedRules.forEach((installedRule) => {
    const filteredRules = rulesToInstall.filter(
      (rule) => rule.elastic_rule?.prebuilt_rule_id === installedRule.rule_id
    );
    rulesToUpdate.push(
      ...filteredRules.map(({ id }) => ({
        id,
        elastic_rule: {
          id: installedRule.id,
        },
      }))
    );
  });

  return rulesToUpdate;
};

export const installCustomRules = async (
  rulesToInstall: StoredRuleMigration[],
  enabled: boolean,
  detectionRulesClient: IDetectionRulesClient
): Promise<UpdateRuleMigrationData[]> => {
  const rulesToUpdate: UpdateRuleMigrationData[] = [];
  const createCustomRulesOutcome = await initPromisePool({
    concurrency: MAX_CUSTOM_RULES_TO_CREATE_IN_PARALLEL,
    items: rulesToInstall,
    executor: async (rule) => {
      if (!isMigrationCustomRule(rule.elastic_rule)) {
        return;
      }
      const payloadRule = convertMigrationCustomRuleToSecurityRulePayload(
        rule.elastic_rule,
        enabled
      );
      const createdRule = await detectionRulesClient.createCustomRule({
        params: payloadRule,
      });
      rulesToUpdate.push({
        id: rule.id,
        elastic_rule: {
          id: createdRule.id,
        },
      });
    },
  });
  if (createCustomRulesOutcome.errors) {
    throw new AggregateError(createCustomRulesOutcome.errors, 'Error installing custom rules');
  }
  return rulesToUpdate;
};

interface InstallTranslatedProps {
  /**
   * The migration id
   */
  migrationId: string;

  /**
   * If specified, then installable translated rules in theThe list will be installed,
   * otherwise all installable translated rules will be installed.
   */
  ids?: string[];

  /**
   * Indicates whether the installed migration rules should be enabled
   */
  enabled: boolean;

  /**
   * The security solution context
   */
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext;

  /**
   * The rules client to create rules
   */
  rulesClient: RulesClient;

  /**
   * The saved objects client
   */
  savedObjectsClient: SavedObjectsClientContract;
}

export const installTranslated = async ({
  migrationId,
  ids,
  enabled,
  securitySolutionContext,
  rulesClient,
  savedObjectsClient,
}: InstallTranslatedProps) => {
  const detectionRulesClient = securitySolutionContext.getDetectionRulesClient();
  const ruleMigrationsClient = securitySolutionContext.getSiemRuleMigrationsClient();

  if (ids?.length) {
    const notFullyTranslatedRules = await getAllMigrationRules({
      migrationId,
      filters: { ids, notFullyTranslated: true },
      securitySolutionContext,
    });
    if (notFullyTranslatedRules.length) {
      const ruleIds = notFullyTranslatedRules.map((rule) => rule.id);
      throw new Error(`Cannot install rules that are not fully translated: ${ruleIds.join()}`);
    }
  }

  const prebuiltRulesToInstall = await getAllMigrationRules({
    migrationId,
    filters: { ids, installable: true, prebuilt: true },
    securitySolutionContext,
  });

  const customRulesToInstall = await getAllMigrationRules({
    migrationId,
    filters: { ids, installable: true, custom: true },
    securitySolutionContext,
  });

  const updatedPrebuiltRules = await installPrebuiltRules(
    prebuiltRulesToInstall,
    enabled,
    securitySolutionContext,
    rulesClient,
    savedObjectsClient,
    detectionRulesClient
  );

  const updatedCustomRules = await installCustomRules(
    customRulesToInstall,
    enabled,
    detectionRulesClient
  );

  const rulesToUpdate: UpdateRuleMigrationData[] = [...updatedPrebuiltRules, ...updatedCustomRules];

  if (rulesToUpdate.length) {
    await ruleMigrationsClient.data.rules.update(rulesToUpdate);
  }
};
