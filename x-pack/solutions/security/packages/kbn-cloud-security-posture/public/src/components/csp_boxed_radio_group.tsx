/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  useEuiTheme,
  useGeneratedHtmlId,
  EuiCheckableCard,
  EuiIcon,
  EuiToolTip,
  EuiBetaBadge,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface CspRadioGroupProps {
  disabled?: boolean;
  options: CspRadioOption[];
  onChange(id: string): void;
  idSelected: string;
  size?: 's' | 'm';
  name?: string;
}

export interface CspRadioOption {
  disabled?: boolean;
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
  isBeta?: boolean;
  testId?: string;
}

export const RadioGroup = ({
  idSelected,
  size,
  options,
  disabled,
  onChange,
  name,
}: CspRadioGroupProps) => {
  const { euiTheme } = useEuiTheme();
  const generatedGroupName = useGeneratedHtmlId({ prefix: 'cspBoxedRadioGroup' });
  const groupName = name || generatedGroupName;
  return (
    <div
      css={css`
        display: flex;
        flex-flow: row wrap;
        gap: ${euiTheme.size.s};

        // Show rows for m- screens (below 768px)
        @media only screen and (max-width: ${euiTheme.breakpoint.m}px) {
          .euiToolTipAnchor {
            min-width: 100%;
          }
        }
      `}
    >
      {options.map((option) => {
        const isChecked = option.id === idSelected;
        const isDisabled = option.disabled || disabled;
        return (
          <EuiToolTip
            key={option.id}
            content={option.tooltip}
            anchorProps={{
              style: {
                flex: '1 1 0',
              },
            }}
          >
            <EuiCheckableCard
              id={option.id}
              data-test-subj={option.testId}
              name={groupName}
              checked={isChecked}
              disabled={isDisabled}
              onChange={() => onChange(option.id)}
              label={
                <>
                  {option.label}
                  {option.isBeta && (
                    <span
                      css={css`
                        margin: auto;
                      `}
                    >
                      <EuiBetaBadge label="Beta" alignment="middle" />
                    </span>
                  )}
                  {option.icon && (
                    <EuiIcon
                      type={option.icon}
                      size="l"
                      aria-hidden={true}
                      css={css`
                        margin-left: auto;
                        ${isDisabled ? 'filter: grayscale(1);' : ''}
                      `}
                    />
                  )}
                </>
              }
              labelProps={{
                css: css`
                  display: flex;
                  align-items: center;
                  width: 100%;
                  gap: ${euiTheme.size.s};
                `,
              }}
              css={css`
                height: 100%;
                min-height: ${size === 's' ? euiTheme.size.xxl : euiTheme.size.xxxl};
              `}
            />
          </EuiToolTip>
        );
      })}
    </div>
  );
};
