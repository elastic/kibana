/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { MixedCreateRulesEmptyState } from './mixed_create_rules_empty_state';

/** Bound empty-state component for Universal registration and Classic `emptyState` prop. */
export const createMixedCreateRulesEmptyState = ({
  coreStart,
  triggersActionsUi,
  showClassic = true,
}: {
  coreStart: CoreStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  showClassic?: boolean;
}): React.ComponentType => {
  const BoundEmptyState = () => (
    <MixedCreateRulesEmptyState
      http={coreStart.http}
      toasts={coreStart.notifications.toasts}
      registeredRuleTypes={triggersActionsUi.ruleTypeRegistry.list()}
      showClassic={showClassic}
    />
  );
  BoundEmptyState.displayName = 'MixedCreateRulesEmptyStateBound';
  return BoundEmptyState;
};
