/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';

interface HasRuleUpdateCalloutComponent {
  rule: RuleResponse | null;
  hasUpdate: boolean;
  actionButton?: JSX.Element;
  message: string;
}

const HasRuleUpdateCalloutComponent = ({
  rule,
  hasUpdate,
  actionButton,
  message,
}: HasRuleUpdateCalloutComponent) => {
  if (!rule || rule.rule_source.type !== 'external' || !hasUpdate) {
    return null;
  }
  return (
    <>
      <EuiCallOut title={i18n.HAS_RULE_UPDATE_CALLOUT_TITLE} color="primary" iconType="gear">
        <p>{message}</p>
        {actionButton}
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};

export const HasRuleUpdateCallout = React.memo(HasRuleUpdateCalloutComponent);
