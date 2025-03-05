/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { RuleUpdateCallout } from '../components/rule_details/rule_update_callout';

interface UseRuleUpgradeCalloutProps {
  rule: RuleResponse | null;
  message: string;
  actionButton?: JSX.Element;
  onUpgrade?: () => void;
}

export const useRuleUpgradeCallout = ({
  rule,
  message,
  actionButton,
  onUpgrade,
}: UseRuleUpgradeCalloutProps): JSX.Element | null =>
  !rule || rule.rule_source.type !== 'external' ? null : (
    <RuleUpdateCallout
      actionButton={actionButton}
      message={message}
      rule={rule}
      onUpgrade={onUpgrade}
    />
  );
