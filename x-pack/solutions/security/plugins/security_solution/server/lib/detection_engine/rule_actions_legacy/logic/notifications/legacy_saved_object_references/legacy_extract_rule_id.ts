/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectReference } from '@kbn/core/server';

// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleReference } from '../../rule_actions/legacy_utils';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRulesNotificationParams } from '../legacy_types';

/**
 * This extracts the "ruleAlertId" "id" and returns it as a saved object reference.
 * NOTE: Due to rolling upgrades with migrations and a few bugs with migrations, I do an additional check for if "ruleAlertId" exists or not. Once
 * those bugs are fixed, we can remove the "if (ruleAlertId == null) {" check, but for the time being it is there to keep things running even
 * if ruleAlertId has not been migrated.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @param logger The kibana injected logger
 * @param ruleAlertId The rule alert id to get the id from and return it as a saved object reference.
 * @returns The saved object references from the rule alert id
 */
export const legacyExtractRuleId = ({
  logger,
  ruleAlertId,
}: {
  logger: Logger;
  ruleAlertId: LegacyRulesNotificationParams['ruleAlertId'];
}): SavedObjectReference[] => {
  if (ruleAlertId == null) {
    logger.error(
      [
        'Security Solution notification (Legacy) system "ruleAlertId" is null or undefined when it never should be. ',
        'This indicates potentially that saved object migrations did not run correctly. Returning empty reference.',
      ].join('')
    );
    return [];
  } else {
    return [legacyGetRuleReference(ruleAlertId)];
  }
};
