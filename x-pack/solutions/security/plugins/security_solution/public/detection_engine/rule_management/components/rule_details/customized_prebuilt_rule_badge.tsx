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

interface CustomizedPrebuiltRuleBadgeProps {
  rule: RuleResponse | null;
}

export const CustomizedPrebuiltRuleBadge: React.FC<CustomizedPrebuiltRuleBadgeProps> = ({
  rule,
}) => {
  const {
    actions: { openBaseVersionFlyout },
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
        <EuiBadge
          data-test-subj="modified-prebuilt-rule-badge"
          color="hollow"
          iconType="expand"
          iconSide="right"
          onClick={() => openBaseVersionFlyout({ isReverting: false })}
          iconOnClick={() => openBaseVersionFlyout({ isReverting: false })}
          onClickAriaLabel={i18n.MODIFIED_PREBUILT_RULE_LABEL}
          iconOnClickAriaLabel={i18n.MODIFIED_PREBUILT_RULE_LABEL}
        >
          {i18n.MODIFIED_PREBUILT_RULE_LABEL}
        </EuiBadge>
      ) : (
        <EuiBadge data-test-subj="modified-prebuilt-rule-badge" color="hollow">
          {i18n.MODIFIED_PREBUILT_RULE_LABEL}
        </EuiBadge>
      )}
    </EuiToolTip>
  );
};
