/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { RuleObjectId } from '../../../../../common/api/detection_engine/model/rule_schema';
import { RuleSnoozeBadge } from '../../../rule_management/components/rule_snooze_badge';
import * as i18n from './translations';

interface RuleSnoozeSectionProps {
  ruleId: RuleObjectId; // Rule SO's id (not ruleId)
}

export function RuleSnoozeSection({ ruleId }: RuleSnoozeSectionProps): JSX.Element {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText size="s">{i18n.RULE_SNOOZE_DESCRIPTION}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <RuleSnoozeBadge ruleId={ruleId} showTooltipInline />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
