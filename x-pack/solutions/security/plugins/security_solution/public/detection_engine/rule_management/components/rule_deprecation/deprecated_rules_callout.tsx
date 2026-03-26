/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface DeprecatedRulesCalloutProps {
  title: string;
  description: string;
  buttons: React.ReactNode[];
  onDismiss?: () => void;
  dataTestSubj?: string;
}

export const DeprecatedRulesCallout: React.FC<DeprecatedRulesCalloutProps> = ({
  title,
  description,
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
        <p>{description}</p>
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
