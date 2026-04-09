/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import * as i18n from './translations';

interface DeprecatedRulesCalloutProps {
  title: string;
  description: string;
  reason?: string;
  buttons: React.ReactNode[];
  onDismiss?: () => void;
  dataTestSubj?: string;
}

export const DeprecatedRulesCallout: React.FC<DeprecatedRulesCalloutProps> = ({
  title,
  description,
  reason,
  buttons,
  onDismiss,
  dataTestSubj,
}) => {
  return (
    <>
      <EuiCallOut
        title={title}
        color="warning"
        iconType="warning"
        onDismiss={onDismiss}
        data-test-subj={dataTestSubj}
      >
        {reason && (
          <>
            <EuiText size="s" data-test-subj="deprecated-rule-reason">
              <p>
                {i18n.DEPRECATION_REASON_LABEL} {reason}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiText size="s" data-test-subj="deprecated-rule-callout-description">
          <p>{description}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s">
          {buttons.map((button, index) => (
            <EuiFlexItem grow={false} key={index}>
              {button}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};
