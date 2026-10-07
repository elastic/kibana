/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import * as i18n from './translations';

// Single-line rows keep every slide the same height, so switching slides never shifts the layout.
const truncateCss = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// The assign action sits before a divider; the AI and overflow actions after it.
const LEADING_ACTION_ICON = 'plusCircle' as const;
const TRAILING_ACTION_ICONS = ['productAgent', 'boxesVertical'] as const;

interface Props {
  age: string;
  reopened?: boolean;
  title: string;
  description: string;
  /** Position in the slide; staggers the row's entrance so the list cascades in. */
  index: number;
}

/**
 * A single decorative queue row in the UI preview, preceded by a divider. Spacing mirrors the
 * notdaybreak_mvp Black Hat queue card (`BlackHatCardShell`), expressed with EUI theme tokens:
 * - padding 20/16/24/24 — a 24px inset, less 4px at top (meta centers in a 24px track) and 8px at
 *   right (the 32px action buttons carry their own chrome around a 16px glyph).
 * - 6px between the meta row and the title; 2px between the title and description.
 * On mount it fades and rises in, delayed by `index` so rows cascade after the slide header;
 * gated on `euiCanAnimate` so reduced-motion users see an instant swap.
 */
export const OnboardingPreviewRow: React.FC<Props> = ({
  age,
  reopened,
  title,
  description,
  index,
}) => {
  const { euiTheme } = useEuiTheme();

  const rowEnter = keyframes`
    from {
      opacity: 0;
      transform: translateY(${euiTheme.size.s});
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  `;

  const rowCss = css`
    display: flex;
    flex-direction: column;
    gap: calc(${euiTheme.size.s} - ${euiTheme.size.xs} / 2); /* 6px: meta -> title */
    padding: calc(${euiTheme.size.l} - ${euiTheme.size.xs}) ${euiTheme.size.base} ${euiTheme.size.l}
      ${euiTheme.size.l};

    ${euiCanAnimate} {
      /* "both" holds a delayed row at opacity 0 until its turn instead of flashing it visible. */
      animation: ${rowEnter} ${euiTheme.animation.normal} ${euiTheme.animation.resistance} both;
      animation-delay: calc(${euiTheme.animation.extraFast} * ${index + 1});
    }
  `;

  const topRowCss = css`
    /* A fixed 24px track: the 32px action hit-boxes overflow-center in it rather than growing the row. */
    block-size: ${euiTheme.size.l};
  `;

  const actionsCss = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    flex-shrink: 0;
    padding-inline-start: ${euiTheme.size.xs};
  `;

  const actionIconCss = css`
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: ${euiTheme.size.xl}; /* 32px hit area around a 16px glyph */
    inline-size: ${euiTheme.size.xl};
  `;

  const dividerCss = css`
    inline-size: ${euiTheme.border.width.thin};
    block-size: ${euiTheme.size.base}; /* 16px */
    margin-inline: ${euiTheme.size.xs};
    background: ${euiTheme.border.color};
    flex-shrink: 0;
  `;

  const copyCss = css`
    display: flex;
    flex-direction: column;
    gap: calc(${euiTheme.size.xs} / 2); /* 2px: title -> description */
    min-inline-size: 0;
  `;

  return (
    <>
      <EuiHorizontalRule margin="none" />
      <div css={rowCss}>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          css={topRowCss}
        >
          <EuiFlexItem
            grow={false}
            css={css`
              min-inline-size: 0;
            `}
          >
            <EuiText size="xs" color="subdued" css={truncateCss}>
              {reopened ? `${age} · ${i18n.PREVIEW_REOPENED}` : age}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div css={actionsCss}>
              <div css={actionIconCss}>
                <EuiIcon type={LEADING_ACTION_ICON} aria-hidden={true} />
              </div>
              <span css={dividerCss} aria-hidden={true} />
              {TRAILING_ACTION_ICONS.map((iconType) => (
                <div css={actionIconCss} key={iconType}>
                  <EuiIcon type={iconType} aria-hidden={true} />
                </div>
              ))}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>

        <div css={copyCss}>
          <EuiText size="s" css={truncateCss}>
            <strong>{title}</strong>
          </EuiText>
          <EuiText size="s" css={truncateCss}>
            {description}
          </EuiText>
        </div>
      </div>
    </>
  );
};
