/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

interface OnboardingPathPanelProps {
  icon: string;
  title: string;
  description: ReactNode;
  onClick: () => void;
  dataTestSubj: string;
  telemetryId: string;
}

export const OnboardingPathPanel = ({
  icon,
  title,
  description,
  onClick,
  dataTestSubj,
  telemetryId,
}: OnboardingPathPanelProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    // The EuiPanel wrapper here is a temporary fix as there is an EUI bug which causes a style
    // conflict with direction="row" on EuiSplitPanel.Outer when an onClick is added
    <EuiPanel
      element="div"
      onClick={onClick}
      data-test-subj={dataTestSubj}
      data-telemetry-id={telemetryId}
      hasBorder
      paddingSize="none"
    >
      <EuiSplitPanel.Outer
        direction="row"
        hasBorder={false}
        hasShadow={false}
        css={{ height: '100%' }}
      >
        <EuiSplitPanel.Inner color="subdued" grow={false} paddingSize="l">
          <EuiFlexGroup alignItems="center" justifyContent="center" css={{ height: '100%' }}>
            <EuiFlexItem grow={false}>
              <EuiImage size={euiTheme.base * 4} src={icon} alt="" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner paddingSize="l">
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiTitle size="s">
                <h2>{title}</h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText color="subdued" size="s">
              {description}
            </EuiText>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiPanel>
  );
};
