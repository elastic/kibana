/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { isCustomizedPrebuiltRule } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';
import { useRuleCustomizationsContext } from './rule_customizations_diff/rule_customizations_context';
import { PrebuiltRuleDiffBadge } from './prebuilt_rule_diff_badge';

interface ModifiedRuleBadgeProps {
  rule: RuleResponse | null;
}

export const ModifiedRuleBadge: React.FC<ModifiedRuleBadgeProps> = ({ rule }) => {
  const {
    state: { doesBaseVersionExist },
  } = useRuleCustomizationsContext();

  const toolTipTitle = useMemo(
    () =>
      doesBaseVersionExist
        ? i18n.MODIFIED_PREBUILT_DIFF_TOOLTIP_TITLE
        : i18n.NO_BASE_VERSION_MODIFIED_PREBUILT_DIFF_TOOLTIP_TITLE,
    [doesBaseVersionExist]
  );

  const toolTipContent = useMemo(
    () =>
      doesBaseVersionExist
        ? i18n.MODIFIED_PREBUILT_DIFF_TOOLTIP_CONTENT
        : i18n.NO_BASE_VERSION_MODIFIED_PREBUILT_DIFF_TOOLTIP_CONTENT,
    [doesBaseVersionExist]
  );

  if (rule === null || !isCustomizedPrebuiltRule(rule)) {
    return null;
  }

  return (
    <EuiToolTip position="top" title={toolTipTitle} content={toolTipContent}>
      {doesBaseVersionExist ? (
        <PrebuiltRuleDiffBadge
          label={i18n.MODIFIED_PREBUILT_RULE_LABEL}
          dataTestSubj="modified-prebuilt-rule-badge"
        />
      ) : (
        <EuiBadge data-test-subj="modified-prebuilt-rule-badge-no-base-version" color="hollow">
          {i18n.MODIFIED_PREBUILT_RULE_LABEL}
        </EuiBadge>
      )}
    </EuiToolTip>
  );
};
