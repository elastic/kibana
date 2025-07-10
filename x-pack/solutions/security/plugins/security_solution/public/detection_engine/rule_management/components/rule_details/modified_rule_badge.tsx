/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { isCustomizedPrebuiltRule } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';
import { usePrebuiltRuleBaseVersionContext } from './base_version_diff/base_version_context';
import { PrebuiltRuleDiffBadge } from './prebuilt_rule_diff_badge';

interface ModifiedRuleBadgeProps {
  rule: RuleResponse | null;
}

export const ModifiedRuleBadge: React.FC<ModifiedRuleBadgeProps> = ({ rule }) => {
  const {
    state: { doesBaseVersionExist },
  } = usePrebuiltRuleBaseVersionContext();

  if (rule === null || !isCustomizedPrebuiltRule(rule)) {
    return null;
  }

  return (
    <EuiToolTip
      position="top"
      title={!doesBaseVersionExist && i18n.MODIFIED_PREBUILT_DIFF_TOOLTIP_TITLE}
      content={!doesBaseVersionExist && i18n.MODIFIED_PREBUILT_DIFF_TOOLTIP_CONTENT}
    >
      {doesBaseVersionExist ? (
        <PrebuiltRuleDiffBadge
          label={i18n.MODIFIED_PREBUILT_RULE_LABEL}
          dataTestSubj="modified-prebuilt-rule-badge"
        />
      ) : (
        <EuiBadge data-test-subj="modified-prebuilt-rule-badge" color="hollow">
          {i18n.MODIFIED_PREBUILT_RULE_LABEL}
        </EuiBadge>
      )}
    </EuiToolTip>
  );
};
