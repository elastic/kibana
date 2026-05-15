/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { LogoIcon } from '../logo_icon';
import type { ApproachOption } from './types';

interface ApproachSelectorProps {
  legend: string;
  selectedId: string;
  options: ApproachOption[];
}

export const ApproachSelector: React.FC<ApproachSelectorProps> = ({
  legend,
  selectedId,
  options,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <nav aria-label={legend} data-test-subj="approachSelector">
      <EuiFlexGrid columns={2}>
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <EuiFlexItem key={option.id}>
              <a
                href={option.href}
                onClick={option.onClick}
                data-test-subj={`approachSelectorCard-${option.id}`}
                aria-current={isSelected ? 'page' : undefined}
                css={css`
                  text-decoration: none;
                  color: inherit;
                  display: block;
                  border-radius: ${euiTheme.border.radius.medium};
                  &:focus-visible {
                    outline: 2px solid ${euiTheme.colors.primary};
                    outline-offset: 2px;
                  }
                `}
              >
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  css={
                    isSelected
                      ? css`
                          border-color: ${euiTheme.colors.primary};
                          box-shadow: inset 0 0 0 1px ${euiTheme.colors.primary};
                        `
                      : undefined
                  }
                >
                  <EuiText>
                    <strong>{option.label}</strong>
                  </EuiText>
                  {option.recommended && (
                    <>
                      <EuiSpacer size="xs" />
                      <EuiBadge
                        color="hollow"
                        data-test-subj={`approachSelectorRecommendedBadge-${option.id}`}
                      >
                        {i18n.translate(
                          'xpack.observability_onboarding.approachSelector.recommendedBadge',
                          { defaultMessage: 'Recommended' }
                        )}
                      </EuiBadge>
                    </>
                  )}
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    {option.description}
                  </EuiText>
                  <EuiSpacer size="s" />
                  <LogoIcon logo={option.logo} size="l" />
                </EuiPanel>
              </a>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </nav>
  );
};
