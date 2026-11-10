/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiIcon, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
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

/** Full-width list footer: “Show N more of M” with a down chevron — shared by home and onboarding. */
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
        padding: ${euiTheme.size.m};
        border: none;
        border-top: ${euiTheme.border.thin};
        background: ${euiTheme.colors.emptyShade};
        cursor: ${isLoading ? 'default' : 'pointer'};
        font-size: ${euiTheme.size.m};
        line-height: ${euiTheme.size.base};
        font-weight: ${euiTheme.font.weight.bold};
        color: ${euiTheme.colors.textParagraph};

        &:hover:not(:disabled) {
          background: ${euiTheme.colors.backgroundBaseSubdued};
        }
      `}
      {...rest}
    >
      {isLoading ? (
        <EuiLoadingSpinner size="s" />
      ) : (
        <EuiIcon type="chevronSingleDown" size="s" aria-hidden={true} />
      )}
      {i18n.translate('xpack.nightshift.showMoreButton.label', {
        defaultMessage: 'Show {count} more',
        values: { count: revealCount },
      })}{' '}
      <span
        css={css`
          font-weight: ${euiTheme.font.weight.regular};
          color: ${euiTheme.colors.textDisabled};
        `}
      >
        {i18n.translate('xpack.nightshift.showMoreButton.ofRemaining', {
          defaultMessage: 'of {count}',
          values: { count: remaining },
        })}
      </span>
    </button>
  );
}
