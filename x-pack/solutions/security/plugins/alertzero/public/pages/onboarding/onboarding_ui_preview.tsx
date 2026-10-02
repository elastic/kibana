/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

const AUTO_ADVANCE_MS = 6000;

// Single-line rows keep every slide the same height, so switching slides never shifts the layout.
const truncateCss = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// Assignees, open in chat, and more actions.
const ROW_ACTION_ICONS = ['plusCircle', 'productAgent', 'boxesVertical'] as const;

/**
 * Static, illustrative mock of the running AlertZero queue that cycles through its sections. Rows are
 * decorative, so they are hidden from assistive tech; only the section tabs are interactive.
 * Rotation stops as soon as the user picks a section.
 */
export const OnboardingUiPreview: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  useEffect(() => {
    if (!autoAdvance) return;
    const timer = setInterval(
      () => setActiveIndex((index) => (index + 1) % i18n.PREVIEW_SLIDES.length),
      AUTO_ADVANCE_MS
    );
    return () => clearInterval(timer);
  }, [autoAdvance]);

  const { label, subtitle, count, badgeColor, items } = i18n.PREVIEW_SLIDES[activeIndex];

  return (
    <EuiPanel
      color="transparent"
      hasShadow={false}
      paddingSize="l"
      css={css`
        border: ${euiTheme.border.width.thin} solid transparent;
        border-radius: ${euiTheme.size.m};
        background: linear-gradient(
              97.76deg,
              ${euiTheme.colors.backgroundBasePrimary} 17%,
              ${euiTheme.colors.backgroundBaseAccent} 83%
            )
            padding-box,
          linear-gradient(
              97.76deg,
              ${euiTheme.colors.backgroundLightPrimary} 17%,
              ${euiTheme.colors.backgroundLightAccent} 83%
            )
            border-box;
      `}
      data-test-subj="alertZeroOnboardingUiPreview"
    >
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <p>{i18n.INTRO_PREVIEW_HEADING}</p>
          </EuiTitle>
          <EuiText color="subdued">
            <p>{subtitle}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div role="tablist" aria-label={i18n.PREVIEW_TABLIST_LABEL}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {i18n.PREVIEW_SLIDES.map((slide, index) => {
                const selected = index === activeIndex;
                return (
                  <EuiFlexItem grow={false} key={slide.id}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-label={slide.label}
                      tabIndex={selected ? 0 : -1}
                      data-test-subj={`alertZeroOnboardingPreviewDot-${slide.id}`}
                      onClick={() => {
                        setAutoAdvance(false);
                        setActiveIndex(index);
                      }}
                      css={css`
                        block-size: ${euiTheme.size.s};
                        inline-size: ${selected ? euiTheme.size.l : euiTheme.size.s};
                        transition: inline-size 0.25s cubic-bezier(0.32, 0.72, 0, 1),
                          background-color 0.25s cubic-bezier(0.32, 0.72, 0, 1);
                        border-radius: ${euiTheme.size.s};
                        border: none;
                        padding: 0;
                        cursor: pointer;
                        background-color: ${selected
                          ? euiTheme.colors.primary
                          : transparentize(euiTheme.colors.primary, 0.2)};
                      `}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="none" aria-hidden="true">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} css={{ padding: 16 }}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="chevronSingleDown" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <p>{label}</p>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={badgeColor}>{count}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        {items.map(({ age, reopened, title, description }) => (
          <React.Fragment key={title}>
            <EuiHorizontalRule margin="none" />
            <EuiFlexGroup
              gutterSize="m"
              alignItems="flexStart"
              responsive={false}
              css={{ padding: 16 }}
            >
              <EuiFlexItem
                css={css`
                  min-inline-size: 0;
                `}
              >
                <EuiText size="xs" color="subdued">
                  {reopened ? `${age} · ${i18n.PREVIEW_REOPENED}` : age}
                </EuiText>
                <EuiText size="s" css={truncateCss}>
                  <strong>{title}</strong>
                </EuiText>
                <EuiText size="s" css={truncateCss}>
                  {description}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
                  {ROW_ACTION_ICONS.map((iconType) => (
                    <EuiFlexItem grow={false} key={iconType}>
                      <div
                        css={css`
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          block-size: ${euiTheme.size.xl};
                          inline-size: ${euiTheme.size.xl};
                        `}
                      >
                        <EuiIcon type={iconType} aria-hidden={true} />
                      </div>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </React.Fragment>
        ))}
      </EuiPanel>
    </EuiPanel>
  );
};
