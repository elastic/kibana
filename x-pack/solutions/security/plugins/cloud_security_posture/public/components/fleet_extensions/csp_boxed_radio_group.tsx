/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiButton, EuiRadio, EuiToolTip, EuiBetaBadge } from '@elastic/eui';
import { css } from '@emotion/react';

export interface CspRadioGroupProps {
  disabled?: boolean;
  options: CspRadioOption[];
  onChange(id: string): void;
  idSelected: string;
  size?: 's' | 'm';
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
}: CspRadioGroupProps) => {
  const { euiTheme } = useEuiTheme();
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
            <EuiButton
              disabled={option.disabled || disabled}
              style={{
                border: `1px solid ${
                  isChecked ? euiTheme.colors.primary : euiTheme.colors.lightShade
                }`,
              }}
              // Use empty string to fallback to no color
              // @ts-ignore
              color={isChecked ? 'primary' : ''}
              onClick={() => onChange(option.id)}
              iconType={option.icon}
              iconSide="right"
              contentProps={{
                style: {
                  justifyContent: 'flex-start',
                },
              }}
              css={css`
                width: 100%;
                height: ${size === 's' ? euiTheme.size.xxl : euiTheme.size.xxxl};
                svg,
                img {
                  margin-left: auto;
                }

                &&,
                &&:hover {
                  text-decoration: none;
                }
                &:disabled {
                  svg,
                  img {
                    filter: grayscale(1);
                  }
                }
              `}
            >
              <EuiRadio
                data-test-subj={option.testId}
                label={option.label}
                id={option.id}
                checked={isChecked}
                onChange={() => {}}
              />
              {option.isBeta && (
                <div
                  css={css`
                    margin: auto;
                  `}
                >
                  <EuiBetaBadge label="Beta" alignment="middle" />
                </div>
              )}
            </EuiButton>
          </EuiToolTip>
        );
      })}
    </div>
  );
};
