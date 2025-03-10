/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';
import { usePrebuiltRulesUpgrade } from '../../hooks/use_prebuilt_rules_upgrade';

interface RuleUpdateCalloutProps {
  rule: RuleResponse;
  message: string;
  actionButton?: JSX.Element;
  onUpgrade?: () => void;
}

const RuleUpdateCalloutComponent = ({
  rule,
  message,
  actionButton,
  onUpgrade,
}: RuleUpdateCalloutProps): JSX.Element | null => {
  const { upgradeReviewResponse, rulePreviewFlyout, openRulePreview } = usePrebuiltRulesUpgrade({
    pagination: {
      page: 1, // we only want to fetch one result
      perPage: 1,
    },
    filter: { rule_ids: [rule.id] },
    onUpgrade,
  });

  const isRuleUpgradeable = useMemo(
    () => upgradeReviewResponse !== undefined && upgradeReviewResponse.total > 0,
    [upgradeReviewResponse]
  );

  const updateCallToActionButton = useMemo(() => {
    if (actionButton) {
      return actionButton;
    }
    return (
      <EuiLink
        onClick={() => openRulePreview(rule.rule_id)}
        data-test-subj="ruleDetailsUpdateRuleCalloutButton"
      >
        {i18n.HAS_RULE_UPDATE_CALLOUT_BUTTON}
      </EuiLink>
    );
  }, [actionButton, openRulePreview, rule.rule_id]);

  if (!isRuleUpgradeable) {
    return null;
  }

  return (
    <>
      <EuiCallOut title={i18n.HAS_RULE_UPDATE_CALLOUT_TITLE} color="primary" iconType="gear">
        <p>{message}</p>
        {updateCallToActionButton}
      </EuiCallOut>
      <EuiSpacer size="l" />
      {rulePreviewFlyout}
    </>
  );
};

export const RuleUpdateCallout = React.memo(RuleUpdateCalloutComponent);
