/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiNotificationBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface PlusCountBadgeProps {
  count: number;
  /** When provided, the badge becomes an interactive button that opens a popover. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  'data-test-subj'?: string;
}

/** Fully-rounded pill radius (Radii-L). Not available as a border.radius token. */
const BADGE_BORDER_RADIUS = 16;

/**
 * Rounded, light-text-background "+N" badge used to summarize the overflow of a
 * metadata field (IPs, geolocations, entity IDs) on the entity node card. When
 * `onClick` is provided it renders as an accessible button that opens the field's
 * details popover and shows an underline on hover/focus; otherwise it is a static
 * badge.
 */
export const PlusCountBadge = ({
  count,
  onClick,
  ariaLabel,
  'data-test-subj': dataTestSubj,
}: PlusCountBadgeProps) => {
  const { euiTheme } = useEuiTheme();

  const onClickHandler = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      onClick?.(e as React.MouseEvent<HTMLButtonElement>);
    },
    [onClick]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!onClick) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
      }
    },
    [onClick]
  );

  const baseStyle = css`
    border-radius: ${BADGE_BORDER_RADIUS}px;
    background: ${euiTheme.colors.backgroundLightText};
    color: ${euiTheme.colors.textParagraph};
  `;

  const interactiveStyle = css`
    cursor: pointer;

    &:hover,
    &:focus {
      text-decoration: underline;
    }
  `;

  return (
    <EuiNotificationBadge
      color="subdued"
      size="s"
      data-test-subj={dataTestSubj}
      aria-label={ariaLabel}
      css={onClick ? [baseStyle, interactiveStyle] : baseStyle}
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: onClickHandler,
            onKeyDown,
          }
        : {})}
    >
      {`+${count}`}
    </EuiNotificationBadge>
  );
};

PlusCountBadge.displayName = 'PlusCountBadge';
