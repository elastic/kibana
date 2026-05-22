/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

export const ExpectedHeader: React.FC = () => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type="check" color="success" size="s" aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="success">
        <strong>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.components.mlAnomalousBehaviors.shared.expectedLabel"
            defaultMessage="Expected"
          />
        </strong>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ObservedHeader: React.FC = () => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type="alert" color="danger" size="s" aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="danger">
        <strong>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.components.mlAnomalousBehaviors.shared.observedLabel"
            defaultMessage="Observed"
          />
        </strong>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const BaselineFooter: React.FC = () => (
  <EuiText size="xs" color="subdued">
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.components.mlAnomalousBehaviors.shared.baselineWindow"
      defaultMessage="90d learned baseline"
    />
  </EuiText>
);

export const ExpectedPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiFlexItem>
    <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
      <ExpectedHeader />
      <EuiSpacer size="xs" />
      {children}
      <EuiSpacer size="xs" />
      <BaselineFooter />
    </EuiPanel>
  </EuiFlexItem>
);

export const ObservedPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem>
      <EuiPanel
        paddingSize="s"
        hasBorder={false}
        hasShadow={false}
        css={css`
          background-color: ${euiTheme.colors.danger}11;
        `}
      >
        <ObservedHeader />
        <EuiSpacer size="xs" />
        {children}
      </EuiPanel>
    </EuiFlexItem>
  );
};

interface MultiplierBadgeProps {
  actual: number | null;
  typical: number | null;
}

export const MultiplierBadge: React.FC<MultiplierBadgeProps> = ({ actual, typical }) => {
  const { euiTheme } = useEuiTheme();
  if (actual === null || typical === null || typical <= 0) return null;
  const multiplier = Math.round(actual / typical);
  if (multiplier <= 1) return null;
  return (
    <EuiBadge
      css={css`
        background-color: ${euiTheme.colors.danger}22;
        color: color-mix(in srgb, ${euiTheme.colors.danger}, black 30%);
      `}
    >
      {`${multiplier}× above baseline`}
    </EuiBadge>
  );
};
