/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiButton, EuiText, useEuiTheme, type EuiButtonProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type ShowMoreButtonProps = {
  /** How many items this click will reveal (capped by what remains). */
  count: number;
  /** How many items are still hidden. */
  remaining: number;
  isLoading?: boolean;
} & Omit<
  EuiButtonProps,
  'children' | 'color' | 'size' | 'iconType' | 'iconSide' | 'isLoading' | 'fullWidth' | 'css'
>;

/** Full-width list footer: “Show N more of M” with a down chevron — shared by home and onboarding. */
export function ShowMoreButton({
  count,
  remaining,
  onClick,
  isLoading = false,
  isDisabled,
  'data-test-subj': dataTestSubj,
  'aria-label': ariaLabel,
  ...rest
}: ShowMoreButtonProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const revealCount = Math.min(count, remaining);

  return (
    <EuiButton
      fullWidth
      color="text"
      size="m"
      iconType="chevronSingleDown"
      iconSide="left"
      isLoading={isLoading}
      isDisabled={isDisabled || isLoading}
      onClick={onClick}
      data-test-subj={dataTestSubj}
      aria-label={ariaLabel}
      css={css`
        /* Keep the list-footer strip look: flat, full-bleed, top border only. */
        && {
          border: none;
          border-radius: 0;
          border-top: ${euiTheme.border.thin};
          background: ${euiTheme.colors.emptyShade};
          box-shadow: none;
          color: ${euiTheme.colors.textParagraph};
          font-weight: ${euiTheme.font.weight.bold};
          height: auto;
          min-height: 0;
          padding: ${euiTheme.size.m};

          &:hover:not(:disabled),
          &:focus,
          &:focus-visible {
            background: ${euiTheme.colors.backgroundBaseSubdued};
            text-decoration: none;
          }
        }
      `}
      {...rest}
    >
      {i18n.translate('xpack.nightshift.showMoreButton.label', {
        defaultMessage: 'Show {count} more',
        values: { count: revealCount },
      })}{' '}
      <EuiText
        component="span"
        color={euiTheme.colors.textDisabled}
        css={css`
          display: inline;
          font-size: inherit;
          font-weight: ${euiTheme.font.weight.regular};
          line-height: inherit;
        `}
      >
        {i18n.translate('xpack.nightshift.showMoreButton.ofRemaining', {
          defaultMessage: 'of {count}',
          values: { count: remaining },
        })}
      </EuiText>
    </EuiButton>
  );
}
