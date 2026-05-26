/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';

import { ShellSpinner } from './shell_spinner';
import { useStartNightshiftConversation } from './use_start_nightshift_conversation';

/**
 * Prompt sent to Agent Builder when the user clicks "Explain this".
 */
const EXPLAIN_PROMPT = i18n.translate('xpack.observability.nightshift.loading.explainPrompt', {
  defaultMessage:
    'I will monitor how your current workflows are doing, and provide reasoning and a summary.',
});

interface OverviewStat {
  id: string;
  label: string;
  iconType?: IconType;
  /** Use the same braille loading glyph as the title spinner. */
  isLoading?: boolean;
  /** Value rendered next to the icon — a dash when there's no data yet. */
  value: string;
}

const OVERVIEW_STATS: OverviewStat[] = [
  { id: 'entities', label: 'Entities', iconType: 'layers', value: '24' },
  { id: 'service', label: 'Service', iconType: 'node', value: '4' },
  { id: 'technologies', label: 'Technologies', iconType: 'package', value: '8' },
  { id: 'workflowsRunning', label: 'Workflows running', isLoading: true, value: '6' },
];

const STAT_GLYPH_BG_SIZE = 24;

/**
 * "Loading" Nightshift page. Mounted by `NightshiftPage` when the chrome
 * Nightshift status dropdown is set to `'loading'`. Shows the
 * "We are still analysing your data …" panel + Overview grid + Summary
 * with the Go to Workflows / Explain this buttons.
 *
 * Mirrors the Figma layout at node 544:66659.
 */
export const NightshiftLoading: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { isExiting, start, exitDurationMs } = useStartNightshiftConversation();

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="l"
      responsive={false}
      data-test-subj="nightshiftLoadingPage"
      aria-hidden={isExiting ? 'true' : undefined}
      css={css`
        width: 100%;
        max-width: 753px;
        margin: 0 auto;
        opacity: ${isExiting ? 0 : 1};
        transform: ${isExiting ? 'translateY(-6px)' : 'translateY(0)'};
        transition: opacity ${exitDurationMs}ms ease-out, transform ${exitDurationMs}ms ease-out;
        pointer-events: ${isExiting ? 'none' : 'auto'};
        @media (prefers-reduced-motion: reduce) {
          transition: opacity ${exitDurationMs}ms linear;
          transform: none;
        }
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              aria-hidden
              css={css`
                width: 40px;
                height: 40px;
                border-radius: 20px;
                background: ${euiTheme.colors.borderBaseSubdued};
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              <ShellSpinner size={20} aria-label="Analyzing" />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.observability.nightshift.loading.title', {
                  defaultMessage: 'We are still analysing your data \u2026',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              color="subdued"
              textAlign="center"
              css={css`
                max-width: 596px;
              `}
            >
              <p>
                {i18n.translate('xpack.observability.nightshift.loading.description', {
                  defaultMessage:
                    'Currently there are workflows being executed to detect and discover important significant events from your data.',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem
        grow={false}
        css={css`
          width: 100%;
        `}
      >
        <EuiPanel
          paddingSize="none"
          hasShadow={false}
          hasBorder
          color="plain"
          css={css`
            overflow: hidden;
            border-radius: 12px;
            border-color: ${euiTheme.colors.borderBaseSubdued};
          `}
        >
          <div
            css={css`
              background: ${euiTheme.colors.backgroundBaseSubdued};
              padding: ${euiTheme.size.l};
              border-bottom: ${euiTheme.border.thin};
            `}
          >
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h6>
                    {i18n.translate('xpack.observability.nightshift.loading.overviewLabel', {
                      defaultMessage: 'Overview',
                    })}
                  </h6>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="sun" color="subdued" />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGrid columns={4} gutterSize="s">
              {OVERVIEW_STATS.map((stat) => (
                <EuiFlexItem key={stat.id}>
                  <EuiPanel paddingSize="s" hasShadow={false} hasBorder color="plain">
                    <EuiText size="xs">
                      <strong>{stat.label}</strong>
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      {(stat.iconType || stat.isLoading) && (
                        <EuiFlexItem grow={false}>
                          <span
                            css={css`
                              display: inline-flex;
                              align-items: center;
                              justify-content: center;
                              width: ${STAT_GLYPH_BG_SIZE}px;
                              height: ${STAT_GLYPH_BG_SIZE}px;
                              border-radius: ${euiTheme.border.radius.small};
                              background: ${euiTheme.colors.borderBaseSubdued};
                            `}
                          >
                            {stat.isLoading ? (
                              <ShellSpinner size={14} aria-label={`${stat.label} loading`} />
                            ) : (
                              <EuiIcon type={stat.iconType ?? 'empty'} size="s" />
                            )}
                          </span>
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem grow={false}>
                        <EuiText size="m">
                          <strong>{stat.value}</strong>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          </div>
          <div
            css={css`
              padding: ${euiTheme.size.base} ${euiTheme.size.l};
            `}
          >
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.observability.nightshift.loading.summary', {
                  defaultMessage:
                    'Workflows are running, you can explore the execution state of each step in Workflows. Once finished Nightshift would start monitoring your system.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="primary"
                  data-test-subj="nightshiftGoToWorkflows"
                  // Placeholder — wire to the Workflows app deeplink when
                  // the workflows experience is finalised.
                  onClick={() => {}}
                >
                  {i18n.translate('xpack.observability.nightshift.loading.goToWorkflows', {
                    defaultMessage: 'Go to Workflows',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AiButton
                  variant="base"
                  size="s"
                  data-test-subj="nightshiftExplainThis"
                  isDisabled={isExiting}
                  onClick={() => start({ initialMessage: EXPLAIN_PROMPT })}
                >
                  {i18n.translate('xpack.observability.nightshift.loading.explainThis', {
                    defaultMessage: 'Explain this',
                  })}
                </AiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
