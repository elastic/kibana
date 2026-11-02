/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationProfileInitializer } from '@kbn/anonymization-plugin/server';
import { getDefaultAlertFieldRules } from './default_field_rules';

export const getAlertsDataViewTargetId = (namespace: string) =>
  `security-solution-alert-${namespace}`;
export const ALERTS_DATA_VIEW_TARGET_TYPE = 'data_view' as const;

/**
 * Security-owned lazy initializer for the alerts data view profile.
 * It is idempotent and only creates a profile when needed.
 */
export const securityAlertsProfileInitializer: AnonymizationProfileInitializer = {
  id: 'security_solution.alerts_data_view_profile',
  shouldInitialize: ({ namespace, target }) =>
    target.type === ALERTS_DATA_VIEW_TARGET_TYPE &&
    target.id === getAlertsDataViewTargetId(namespace),
  initialize: async ({
    namespace,
    target,
    logger,
    findProfileByTarget,
    createProfile,
    ensureSalt,
    checkDataViewExists,
  }) => {
    const dataViewExists = await checkDataViewExists(target.id);
    if (!dataViewExists) {
      logger.debug(
        `Alerts data view not yet created in space: ${namespace}, skipping profile initialization`
      );
      return;
    }

    try {
      const existing = await findProfileByTarget(ALERTS_DATA_VIEW_TARGET_TYPE, target.id);
      if (existing) {
        logger.debug(
          `Security alerts data view anonymization profile already exists in space: ${namespace}`
        );
        return;
      }

      await ensureSalt();
      await createProfile({
        name: 'Security Alerts Anonymization Profile',
        description: 'Security Alerts data view allow/anonymize/deny rules for SOC workflows',
        targetType: ALERTS_DATA_VIEW_TARGET_TYPE,
        targetId: target.id,
        rules: {
          fieldRules: getDefaultAlertFieldRules(),
          regexRules: [],
          nerRules: [],
        },
        namespace,
        createdBy: 'system',
      });

      logger.info(`Created security alerts data view anonymization profile in space: ${namespace}`);
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 409) {
        logger.debug(
          `Security alerts data view anonymization profile already exists in space: ${namespace} (concurrent creation)`
        );
        return;
      }
      logger.error(
        `Failed to initialize security alerts data view anonymization profile in space ${namespace}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      throw err;
    }
  },
};
