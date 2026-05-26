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
  EuiButtonIcon,
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

/* ----------------------------------------------------------------------- *
 * Follow-up plan panel — mocks the workflow steps Nightshift runs while
 * it analyses the data. Matches Figma node 887:74247.
 *
 * Each step is either `done` (green check, completed timestamp) or
 * `running` (shell spinner, started timestamp). Real wiring will come
 * once Nightshift workflows are real — for now this is a static mock
 * that mirrors the design.
 * ----------------------------------------------------------------------- */

type WorkflowStepStatus = 'done' | 'running';

interface WorkflowStep {
  id: string;
  label: string;
  status: WorkflowStepStatus;
  timestamp: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'verdict',
    label: 'Significant event Detection',
    status: 'done',
    timestamp: '2 minutes ago',
  },
  {
    id: 'discovery',
    label: 'Significant event Discovery',
    status: 'done',
    timestamp: '2 minutes ago',
  },
  {
    id: 'detection',
    label: 'Significant event Verdict',
    status: 'running',
    timestamp: '2 minutes ago',
  },
];

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
  { id: 'workflowsRunning', label: 'Workflows running', isLoading: true, value: '3' },
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
        </EuiPanel>
      </EuiFlexItem>

      {/* ----------------------------------------------------------------- *
       * Follow-up plan panel — workflow summary + "Explain this" / "Go
       * to Workflows" actions.
       *
       * Matches Figma node 887:74247. Visually distinct panel that sits
       * below the Overview: header row with workflow icon + title +
       * "Open details" action → list of three workflow steps (Verdict /
       * Discovery / Detection) → footer with summary copy and the two
       * action buttons (formerly attached to the Overview footer).
       * ----------------------------------------------------------------- */}
      <EuiFlexItem
        grow={false}
        css={css`
          width: 100%;
        `}
        data-test-subj="nightshiftLoadingFollowUpPlan"
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
          {/* Panel header — workflow icon + title + Open details action */}
          <div
            css={css`
              padding: ${euiTheme.size.base};
              background: ${euiTheme.colors.backgroundBasePlain};
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
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    {/*
                     * Mimics an `EuiAvatar size="s"` (24px round) but
                     * renders the shell-style braille loader instead of
                     * a static icon — signals "workflow is currently
                     * executing" inline with the panel title.
                     */}
                    <div
                      aria-hidden
                      css={css`
                        width: 24px;
                        height: 24px;
                        border-radius: 12px;
                        background: ${euiTheme.colors.backgroundBaseSubdued};
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                      `}
                    >
                      <ShellSpinner size={14} aria-label="Workflow running" />
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>
                        {i18n.translate(
                          'xpack.observability.nightshift.loading.workflowSummary.title',
                          { defaultMessage: 'Workflow execution summary' }
                        )}
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      color="text"
                      data-test-subj="nightshiftWorkflowOpenDetails"
                      onClick={() => {}}
                    >
                      {i18n.translate(
                        'xpack.observability.nightshift.loading.workflowSummary.openDetails',
                        { defaultMessage: 'Close details' }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="boxesHorizontal"
                      color="text"
                      size="s"
                      aria-label={i18n.translate(
                        'xpack.observability.nightshift.loading.workflowSummary.moreAriaLabel',
                        { defaultMessage: 'More actions for the workflow summary' }
                      )}
                      onClick={() => {}}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>

          {/* Workflow step rows */}
          {WORKFLOW_STEPS.map((step, idx) => {
            const isLast = idx === WORKFLOW_STEPS.length - 1;
            return (
              <div
                key={step.id}
                css={css`
                  padding: ${euiTheme.size.s} ${euiTheme.size.base};
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                  border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
                `}
                data-test-subj={`nightshiftWorkflowStep-${step.id}`}
              >
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  responsive={false}
                  gutterSize="s"
                >
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="chevronSingleRight" size="s" color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <strong>{step.label}</strong>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        {step.status === 'done' ? (
                          <EuiIcon
                            type="checkInCircleFilled"
                            color={euiTheme.colors.textSuccess}
                            size="s"
                          />
                        ) : (
                          <ShellSpinner size={14} aria-label={`${step.label} running`} />
                        )}
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {step.timestamp}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="boxesHorizontal"
                          color="text"
                          size="xs"
                          aria-label={i18n.translate(
                            'xpack.observability.nightshift.loading.workflowSummary.stepMoreAriaLabel',
                            {
                              defaultMessage: 'More actions for {step}',
                              values: { step: step.label },
                            }
                          )}
                          onClick={() => {}}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            );
          })}

          {/* Footer summary + actions (moved here from the Overview panel) */}
          <div
            css={css`
              padding: ${euiTheme.size.base};
              background: ${euiTheme.colors.backgroundBasePlain};
              border-top: ${euiTheme.border.thin};
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
                <AiButton
                  variant="base"
                  size="s"
                  iconType="productAgent"
                  data-test-subj="nightshiftExplainThis"
                  isDisabled={isExiting}
                  onClick={() => start({ initialMessage: EXPLAIN_PROMPT, briefMode: 'loading' })}
                >
                  {i18n.translate('xpack.observability.nightshift.loading.explainThis', {
                    defaultMessage: 'Explain this',
                  })}
                </AiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AiButton
                  variant="empty"
                  size="s"
                  data-test-subj="nightshiftGoToWorkflows"
                  isDisabled={isExiting}
                  // Placeholder — wire to the Workflows app deeplink when
                  // the workflows experience is finalised.
                  onClick={() => {}}
                >
                  {i18n.translate('xpack.observability.nightshift.loading.goToWorkflows', {
                    defaultMessage: 'Go to Workflows',
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
