/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';

interface HasRuleUpdateCalloutComponent {
  rule: RuleResponse | null;
  hasUpdate: boolean;
  openRulePreview: (ruleId: string) => void;
}

const HasRuleUpdateCalloutComponent = ({
  rule,
  hasUpdate,
  openRulePreview,
}: HasRuleUpdateCalloutComponent) => {
  if (!rule || rule.rule_source.type !== 'external' || !hasUpdate) {
    return null;
  }
  return (
    <>
      <EuiCallOut title={i18n.HAS_RULE_UPDATE_CALLOUT_TITLE} color="warning" iconType="warning">
        <p>{i18n.HAS_RULE_UPDATE_CALLOUT_MESSAGE}</p>
        <EuiLink
          onClick={() => {
            openRulePreview(rule.rule_id);
          }}
          data-test-subj="ruleName"
        >
          {i18n.HAS_RULE_UPDATE_CALLOUT_BUTTON}
        </EuiLink>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};

export const HasRuleUpdateCallout = React.memo(HasRuleUpdateCalloutComponent);
