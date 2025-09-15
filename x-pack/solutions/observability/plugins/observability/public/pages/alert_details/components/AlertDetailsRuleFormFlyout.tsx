/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { RuleFormStepId } from '@kbn/response-ops-rule-form/src/constants';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../utils/kibana_react';

export interface AlertDetailsRuleFormFlyoutBaseProps {
  onUpdate?: () => void;
  refetch: () => void;
  rule?: Rule;
}

interface Props extends AlertDetailsRuleFormFlyoutBaseProps {
  initialEditStep?: RuleFormStepId;
  isRuleFormFlyoutOpen: boolean;
  setIsRuleFormFlyoutOpen: React.Dispatch<boolean>;
  rule: Rule;
}

export function AlertDetailsRuleFormFlyout({
  initialEditStep,
  onUpdate,
  refetch,
  isRuleFormFlyoutOpen,
  setIsRuleFormFlyoutOpen,
  rule,
}: Props) {
  const { services } = useKibana();
  if (!isRuleFormFlyoutOpen) return null;
  const {
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
  } = services;
  return (
    <RuleFormFlyout
      plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
      id={rule.id}
      onCancel={() => {
        setIsRuleFormFlyoutOpen(false);
      }}
      onSubmit={() => {
        onUpdate?.();
        refetch();
        setIsRuleFormFlyoutOpen(false);
      }}
      initialEditStep={initialEditStep}
    />
  );
}
