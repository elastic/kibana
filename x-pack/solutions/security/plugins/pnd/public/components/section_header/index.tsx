/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import type { CONVERSATION_CATEGORY_COLORS } from '@kbn/pnd-common';

const DOT_SIZE_PX = 6;
const TITLE_FONT_SIZE_PX = 14;
const TITLE_LINE_HEIGHT_PX = 20;

/**
 * The roles a section dot may carry: the four bucket accents `@kbn/pnd-common` assigns
 * (`CONVERSATION_CATEGORY_COLORS`), plus `success` for the record.
 *
 * Derived from that map rather than restated, so a fifth bucket — or a recolored one — cannot leave a
 * section drawing a dot this component has no token for.
 */
export type SectionDotColor =
  | (typeof CONVERSATION_CATEGORY_COLORS)[keyof typeof CONVERSATION_CATEGORY_COLORS]
  | 'success';

export interface SectionHeaderProps {
  /** How many rows the section holds, drawn as a bare digit. */
  count: number;
  /** Identifies the count for tests, which assert on the number rather than on the header. */
  countTestSubj: string;
  /**
   * The section's accent, drawn as a dot. Omitted leaves the header uncolored, for a section whose
   * heading is the whole story.
   */
  dotColor?: SectionDotColor;
  /** Names the section. The heading, and the only thing here that carries the meaning. */
  label: string;
}

/**
 * The trigger content every collapsible section on the page shares: an accent dot, the heading, and
 * the row count.
 *
 * The accent moved **out** of the badge and into a 6px dot: four filled badges read as four
 * severities, so the count — the one number an analyst scans for — was competing with a color that
 * was never about the count. A hollow badge lets the digit carry the weight, and the dot keeps the
 * bucket's identity where it costs nothing.
 *
 * The dot is `aria-hidden` because it says nothing `label` does not, and the count is left out of
 * the heading for the same reason: the accordion's own `aria-label` reads "{label}, {count}
 * approvals" once, rather than a screen reader announcing a bare digit after every heading.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  count,
  countTestSubj,
  dotColor,
  label,
}) => {
  const { euiTheme } = useEuiTheme();

  const dotColors: Readonly<Record<SectionDotColor, string>> = {
    accent: euiTheme.colors.accent,
    danger: euiTheme.colors.danger,
    primary: euiTheme.colors.primary,
    success: euiTheme.colors.success,
    warning: euiTheme.colors.warning,
  };

  return (
    <div
      css={css`
        align-items: center;
        display: flex;
        gap: ${euiTheme.size.s};
      `}
    >
      {dotColor != null && (
        <span
          aria-hidden
          css={css`
            background: ${dotColors[dotColor]};
            block-size: ${DOT_SIZE_PX}px;
            border-radius: 50%;
            flex-shrink: 0;
            inline-size: ${DOT_SIZE_PX}px;
          `}
          data-section-dot={dotColor}
        />
      )}

      <EuiTitle
        css={css`
          font-size: ${TITLE_FONT_SIZE_PX}px;
          font-weight: ${euiTheme.font.weight.semiBold};
          line-height: ${TITLE_LINE_HEIGHT_PX}px;
        `}
        size="xs"
      >
        <h2>{label}</h2>
      </EuiTitle>

      <EuiBadge color="hollow" data-test-subj={countTestSubj}>
        {count}
      </EuiBadge>
    </div>
  );
};
