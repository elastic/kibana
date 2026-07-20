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
  EuiIcon,
  EuiImage,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
    <EuiSplitPanel.Outer
      direction="row"
      onClick={onClick}
      data-test-subj={dataTestSubj}
      data-telemetry-id={telemetryId}
      hasBorder
      hasShadow={false}
      color="plain"
      css={{
        height: '100%',
        // On hover, highlight the card's border in the primary color.
        '&:hover::after': {
          borderColor: euiTheme.colors.primary,
        },
        // On hover, change the icon panel background color to signal the card is clickable.
        '&:hover .vectordbOnboardingPathIconPanel': {
          backgroundColor: euiTheme.colors.backgroundBasePrimary,
        },
      }}
    >
      <EuiSplitPanel.Inner
        color="subdued"
        grow={false}
        paddingSize="l"
        className="vectordbOnboardingPathIconPanel"
      >
        <EuiFlexGroup alignItems="center" justifyContent="center" css={{ height: '100%' }}>
          <EuiFlexItem grow={false}>
            <EuiImage size={euiTheme.base * 4} src={icon} alt="" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="l" color="plain">
        <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="m">
          <EuiFlexGroup gutterSize="s" direction="column" alignItems="flexStart" responsive={false}>
            <EuiTitle size="s">
              <h2>{title}</h2>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              {description}
            </EuiText>
          </EuiFlexGroup>

          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                css={{
                  color: euiTheme.colors.textParagraph,
                  fontWeight: euiTheme.font.weight.semiBold,
                }}
              >
                {i18n.translate('vectordbOnboarding.pathSelection.getStarted', {
                  defaultMessage: 'Get started',
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="sortRight" size="m" aria-hidden={true} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
