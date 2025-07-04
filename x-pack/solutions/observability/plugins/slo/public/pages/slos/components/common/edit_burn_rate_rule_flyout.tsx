/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../../hooks/use_kibana';
import { BurnRateRuleParams } from '../../../../typings';

export function EditBurnRateRuleFlyout({
  refetchRules,
  rule,
  isEditRuleFlyoutOpen,
  setIsEditRuleFlyoutOpen,
}: {
  rule?: Rule<BurnRateRuleParams>;
  isEditRuleFlyoutOpen: boolean;
  setIsEditRuleFlyoutOpen: (value: boolean) => void;
  refetchRules: () => void;
}) {
  const {
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
    ...plugins
  } = useKibana().services;

  const handleSavedRule = async () => {
    refetchRules();
    setIsEditRuleFlyoutOpen(false);
  };

  const handleCloseRuleFlyout = async () => {
    setIsEditRuleFlyoutOpen(false);
  };

  return isEditRuleFlyoutOpen && rule ? (
    <RuleFormFlyout
      plugins={{ ...plugins, ruleTypeRegistry, actionTypeRegistry }}
      id={rule.id}
      onSubmit={handleSavedRule}
      onCancel={handleCloseRuleFlyout}
    />
  ) : null;
}
