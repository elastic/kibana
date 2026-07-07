/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
// eslint-disable-next-line no-restricted-imports
import type { LegacyIRuleActionsAttributesSavedObjectAttributes } from '../../../../lib/detection_engine/rule_actions_legacy';

export const getRuleIdToEnabledMap = (
  legacyRuleActions: Array<
    SavedObjectsFindResult<LegacyIRuleActionsAttributesSavedObjectAttributes>
  >
): Map<
  string,
  {
    enabled: boolean;
  }
> => {
  return legacyRuleActions.reduce((cache, legacyNotificationsObject) => {
    const ruleRef = legacyNotificationsObject.references.find(
      (reference) => reference.name === 'alert_0' && reference.type === 'alert'
    );
    if (ruleRef != null) {
      const enabled = legacyNotificationsObject.attributes.ruleThrottle !== 'no_actions';
      cache.set(ruleRef.id, { enabled });
    }
    return cache;
  }, new Map<string, { enabled: boolean }>());
};
