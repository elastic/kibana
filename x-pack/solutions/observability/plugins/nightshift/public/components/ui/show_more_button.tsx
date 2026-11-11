/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiIcon, EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ShowMoreButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  /** How many items this click will reveal (capped by what remains). */
  count: number;
  /** How many items are still hidden. */
  remaining: number;
  isLoading?: boolean;
  'data-test-subj'?: string;
}

/**
 * Full-width list footer: “Show N more of M” with a down chevron — shared by home and onboarding.
 *
 * Native `<button>` on purpose: this is a list-footer strip (top border, flat fill), not button
 * chrome. Composing EUI for the icon/text keeps us on design tokens without `&&`-overriding
 * `EuiButton`'s borders, radius, height, and fill.
 */
export function ShowMoreButton({
  count,
  remaining,
  onClick,
  isLoading = false,
  disabled,
  'data-test-subj': dataTestSubj,
  'aria-label': ariaLabel,
  ...rest
}: ShowMoreButtonProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const revealCount = Math.min(count, remaining);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      data-test-subj={dataTestSubj}
      aria-label={ariaLabel}
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        gap: ${euiTheme.size.xs};
        width: 100%;
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border: none;
        border-top: ${euiTheme.border.thin};
        border-radius: 0;
        background: ${euiTheme.colors.emptyShade};
        cursor: ${isLoading ? 'default' : 'pointer'};
        color: ${euiTheme.colors.textParagraph};

        &:hover:not(:disabled),
        &:focus,
        &:focus-visible {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `}
      {...rest}
    >
      {isLoading ? (
        <EuiLoadingSpinner size="s" />
      ) : (
        <EuiIcon type="chevronSingleDown" size="s" aria-hidden={true} />
      )}
      <EuiText
        component="span"
        size="s"
        css={css`
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {i18n.translate('xpack.nightshift.showMoreButton.label', {
          defaultMessage: 'Show {count} more',
          values: { count: revealCount },
        })}{' '}
        <EuiText
          component="span"
          size="s"
          color={euiTheme.colors.textDisabled}
          css={css`
            display: inline;
            font-weight: ${euiTheme.font.weight.regular};
          `}
        >
          {i18n.translate('xpack.nightshift.showMoreButton.ofRemaining', {
            defaultMessage: 'of {count}',
            values: { count: remaining },
          })}
        </EuiText>
      </EuiText>
    </button>
  );
}
