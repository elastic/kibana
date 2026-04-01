/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

export interface StepAccordionProps {
  children?: React.ReactNode;
  'data-test-subj'?: string;
  description: string;
  hasError?: boolean;
  initialIsOpen?: boolean;
  isLast?: boolean;
  stepNumber: string;
  title: string;
}

const StepAccordionComponent: React.FC<StepAccordionProps> = ({
  children,
  'data-test-subj': dataTestSubj = 'stepAccordion',
  description,
  hasError = false,
  isLast = true,
  stepNumber,
  title,
}) => {
  const { euiTheme } = useEuiTheme();

  const avatarColor = hasError ? euiTheme.colors.danger : euiTheme.colors.primary;

  const stepStyle = useMemo(
    () =>
      css`
        position: relative;
        ${!isLast
          ? `
            padding-block-end: ${euiTheme.size.xl};
            &::before {
              content: '';
              position: absolute;
              inset-block-start: ${euiTheme.size.xl};
              inset-block-end: 0;
              inset-inline-start: calc(${euiTheme.size.xl} / 2 - ${euiTheme.border.width.thick} / 2);
              border-inline-start: ${euiTheme.border.thick};
            }
          `
          : ''}
      `,
    [euiTheme.border.thick, euiTheme.border.width.thick, euiTheme.size.xl, isLast]
  );

  const contentIndentStyle = useMemo(
    () =>
      css`
        padding-inline-start: calc(${euiTheme.size.xl} + ${euiTheme.size.m});
      `,
    [euiTheme.size.m, euiTheme.size.xl]
  );

  return (
    <div css={stepStyle} data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar
            aria-label={`Step ${stepNumber}`}
            color={avatarColor}
            data-test-subj={`${dataTestSubj}Avatar`}
            name={stepNumber}
            size="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{title}</h3>
          </EuiTitle>

          <EuiSpacer size="xs" />

          <EuiText color="subdued" data-test-subj={`${dataTestSubj}Description`} size="s">
            {description}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {children && (
        <div css={contentIndentStyle}>
          <EuiSpacer size="m" />
          {children}
        </div>
      )}
    </div>
  );
};

StepAccordionComponent.displayName = 'StepAccordion';

export const StepAccordion = React.memo(StepAccordionComponent);
