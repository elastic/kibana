/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import type { RuleAction } from '@kbn/alerting-plugin/common';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import type { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import {
  legacyGetActionReference,
  legacyGetRuleReference,
  legacyGetThrottleOptions,
  legacyTransformActionToReference,
} from './legacy_utils';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
interface LegacyCreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'];
  actions: RuleAction[] | undefined;
  throttle: string | null | undefined;
}

/**
 * NOTE: This should _only_ be seen to be used within the legacy route of "legacyCreateLegacyNotificationRoute" and not exposed and not
 * used anywhere else. If you see it being used anywhere else, that would be a bug.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @see legacyCreateLegacyNotificationRoute
 */
export const legacyCreateRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions = [],
  throttle,
}: LegacyCreateRuleActionsSavedObject): Promise<void> => {
  const referenceWithAlertId: SavedObjectReference[] = [legacyGetRuleReference(ruleAlertId)];
  const actionReferences: SavedObjectReference[] = actions.map((action, index) =>
    legacyGetActionReference(action.id, index)
  );
  const references: SavedObjectReference[] = [...referenceWithAlertId, ...actionReferences];
  await savedObjectsClient.create<LegacyIRuleActionsAttributesSavedObjectAttributes>(
    legacyRuleActionsSavedObjectType,
    {
      actions: actions.map((alertAction, index) =>
        legacyTransformActionToReference(alertAction, index)
      ),
      ...legacyGetThrottleOptions(throttle),
    },
    { references }
  );
};
