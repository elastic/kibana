/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { RuleFormStepId } from '@kbn/response-ops-rule-form/src/constants';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../utils/kibana_react';

export interface UseEditRuleFormFlyoutProps {
  onUpdate?: () => void;
  refetch: () => void;
  rule?: Rule;
}

export function useEditRuleFormFlyout({ onUpdate, refetch, rule }: UseEditRuleFormFlyoutProps) {
  const { services } = useKibana();
  const {
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
  } = services;
  const [ruleConditionsFlyoutOpen, setRuleConditionsFlyoutOpen] = useState<boolean>(false);
  const handleEditRuleDetails = () => {
    setRuleConditionsFlyoutOpen(true);
  };
  const AlertDetailsRuleFormFlyout = React.memo(
    ({ initialEditStep }: { initialEditStep?: RuleFormStepId }) => {
      return rule && ruleConditionsFlyoutOpen ? (
        <RuleFormFlyout
          plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
          id={rule.id}
          onCancel={() => {
            setRuleConditionsFlyoutOpen(false);
          }}
          onSubmit={() => {
            setRuleConditionsFlyoutOpen(false);
            onUpdate?.();
            refetch();
          }}
          initialEditStep={initialEditStep}
        />
      ) : null;
    }
  );
  return { handleEditRuleDetails, AlertDetailsRuleFormFlyout };
}
