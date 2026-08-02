/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';

import { getEntityChipStyles } from './helpers/get_entity_chip_styles';

/** An icon-only chip is square, so the glyph sits centered rather than beside absent text. */
const ICON_ONLY_CHIP_WIDTH_PX = 32;

export interface EntityChipProps {
  /**
   * The accessible name. Required for an icon-only chip, which has no text of its own, and worth
   * setting on a chip whose visible label is a bare term or a `+N` that means nothing read aloud.
   */
  ariaLabel?: string;
  /** How many alerts carry this entity. Absent is not zero, and renders no badge at all. */
  count?: number;
  'data-test-subj'?: string;
  /** Renders the chip as a single centered glyph — the blast radius collapse control. */
  iconType?: IconType;
  /**
   * `true` when this chip is the filter in force. Left undefined by a chip that toggles nothing, so
   * it is not announced as a pressed-state control.
   */
  isActive?: boolean;
  /**
   * `false` renders a `span` instead of a `button`. The hidden row the overflow measurement reads is
   * a duplicate of every chip, and duplicates that were focusable would double the row for a
   * keyboard and a screen reader both.
   */
  isInteractive?: boolean;
  label?: string;
  onClick?: () => void;
}

/**
 * One entity as a pill: a term, and how many alerts carry it.
 *
 * Ported from the prototype's `EntityChip` at `10e153f`. Not an `EuiBadge`, and not a filter pill
 * from another EUI family: the chip is 32px tall with a count badge *inside* it, which is what lets a
 * wrapped row of them read as one paragraph of entities rather than a list of controls.
 */
export const EntityChip: React.FC<EntityChipProps> = ({
  ariaLabel,
  count,
  'data-test-subj': dataTestSubj,
  iconType,
  isActive,
  isInteractive = true,
  label,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();

  const chipStyles = css(
    getEntityChipStyles({
      borderColor: euiTheme.border.color,
      colors: euiTheme.colors,
      hoverBorderColor: euiTheme.components.forms.borderHovered,
      isActive: isActive === true,
    })
  );

  const iconOnlyStyles = css`
    color: ${euiTheme.colors.textParagraph};
    flex-shrink: 0;
    justify-content: center;
    padding: 0;
    width: ${ICON_ONLY_CHIP_WIDTH_PX}px;
  `;

  const content =
    iconType != null ? (
      <EuiIcon color="inherit" size="s" type={iconType} aria-hidden={true} />
    ) : (
      <>
        <span
          css={css`
            align-items: center;
            display: inline-flex;
            min-width: 0;
            padding-inline: 6px;
          `}
        >
          <EuiText
            css={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
            size="xs"
          >
            {label}
          </EuiText>
        </span>

        {count != null && <EuiBadge color="danger">{count}</EuiBadge>}
      </>
    );

  if (!isInteractive) {
    return (
      <span
        aria-label={ariaLabel}
        css={[
          chipStyles,
          iconType != null ? iconOnlyStyles : undefined,
          css`
            cursor: default;
          `,
        ]}
        data-test-subj={dataTestSubj}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={isActive}
      css={[chipStyles, iconType != null ? iconOnlyStyles : undefined]}
      data-test-subj={dataTestSubj}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  );
};
