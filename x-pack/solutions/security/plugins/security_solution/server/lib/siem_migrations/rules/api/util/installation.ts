/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
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
  MAX_CUSTOM_RULES_TO_CREATE_IN_PARALLEL,
  MAX_TRANSLATED_RULES_TO_INSTALL,
} from '../constants';
import {
  convertMigrationCustomRuleToSecurityRulePayload,
  isMigrationCustomRule,
} from '../../../../../../common/siem_migrations/rules/utils';

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
  // TODO: we need to do an error handling which can happen during the rule installation
  const { results: newlyInstalledRules } = await createPrebuiltRules(
    detectionRulesClient,
    installable
  );
  await performTimelinesInstallation(securitySolutionContext);

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
  detectionRulesClient: IDetectionRulesClient,
  logger: Logger
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
    // TODO: we need to do an error handling which can happen during the rule creation
    logger.debug(
      `Failed to create some of the rules because of errors: ${JSON.stringify(
        createCustomRulesOutcome.errors
      )}`
    );
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

  /**
   * The logger
   */
  logger: Logger;
}

export const installTranslated = async ({
  migrationId,
  ids,
  enabled,
  securitySolutionContext,
  rulesClient,
  savedObjectsClient,
  logger,
}: InstallTranslatedProps) => {
  const detectionRulesClient = securitySolutionContext.getDetectionRulesClient();
  const ruleMigrationsClient = securitySolutionContext.getSiemRuleMigrationsClient();

  const { data: rulesToInstall } = await ruleMigrationsClient.data.rules.get(migrationId, {
    filters: { ids, installable: true },
    from: 0,
    size: MAX_TRANSLATED_RULES_TO_INSTALL,
  });

  const { customRulesToInstall, prebuiltRulesToInstall } = rulesToInstall.reduce(
    (acc, item) => {
      if (item.elastic_rule?.prebuilt_rule_id) {
        acc.prebuiltRulesToInstall.push(item);
      } else {
        acc.customRulesToInstall.push(item);
      }
      return acc;
    },
    { customRulesToInstall: [], prebuiltRulesToInstall: [] } as {
      customRulesToInstall: StoredRuleMigration[];
      prebuiltRulesToInstall: StoredRuleMigration[];
    }
  );

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
    detectionRulesClient,
    logger
  );

  const rulesToUpdate: UpdateRuleMigrationData[] = [...updatedPrebuiltRules, ...updatedCustomRules];

  if (rulesToUpdate.length) {
    await ruleMigrationsClient.data.rules.update(rulesToUpdate);
  }
};
