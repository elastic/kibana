/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../../../plugin_contract';

import { EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING } from '../../../../../../../common/constants';
import type {
  RuleExecutionSettings,
  LogLevelSetting,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  DEFAULT_EXTENDED_LOGGING_SETTINGS,
  getExtendedLoggingSettings,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';

export const fetchRuleExecutionSettings = async (
  logger: Logger,
  core: SecuritySolutionPluginCoreSetupDependencies,
  savedObjectsClient: SavedObjectsClientContract
): Promise<RuleExecutionSettings> => {
  try {
    const ruleExecutionSettings = await withSecuritySpan('fetchRuleExecutionSettings', async () => {
      const [coreStart] = await withSecuritySpan('getCoreStartServices', () =>
        core.getStartServices()
      );

      const kibanaAdvancedSettings = await withSecuritySpan('getKibanaAdvancedSettings', () => {
        const settingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);
        return settingsClient.getAll();
      });

      const minLevel = getSetting<LogLevelSetting>(
        kibanaAdvancedSettings,
        EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING,
        DEFAULT_EXTENDED_LOGGING_SETTINGS.minLevel
      );

      return { extendedLogging: getExtendedLoggingSettings(minLevel) };
    });

    return ruleExecutionSettings;
  } catch (e) {
    const logMessage = 'Error fetching rule execution settings';
    const logReason = e instanceof Error ? e.stack ?? e.message : String(e);
    logger.error(`${logMessage}: ${logReason}`);

    return { extendedLogging: DEFAULT_EXTENDED_LOGGING_SETTINGS };
  }
};

const getSetting = <T>(settings: Record<string, unknown>, key: string, defaultValue: T): T => {
  const setting = settings[key];
  return setting != null ? (setting as T) : defaultValue;
};
