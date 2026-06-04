/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';

import {
  EuiBadge,
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

type WorkflowStepStatus = 'done' | 'running' | 'pending';

/** Subset of YAML step types we mock — keeps the type badge small + scannable. */
type WorkflowExecutionStepType =
  | 'elasticsearch.request'
  | 'data.set'
  | 'ai.agent'
  | 'foreach'
  | 'if';

interface WorkflowExecutionStep {
  id: string;
  /** YAML step name — rendered in monospace to read as a real execution line. */
  name: string;
  type: WorkflowExecutionStepType;
  status: WorkflowStepStatus;
  /** Optional duration string (e.g. "120ms") — shown for completed steps. */
  duration?: string;
}

interface Workflow {
  id: string;
  /** Human-readable workflow name shown in the parent row. */
  label: string;
  status: WorkflowStepStatus;
  timestamp: string;
  /** YAML step names rendered inside the expandable execution panel. */
  steps: WorkflowExecutionStep[];
}

/* ----------------------------------------------------------------------- *
 * Workflow execution mock.
 *
 * Three sub-workflows (matching the prototype's pipeline order):
 *   Discovery → Detection → Verdict
 *
 * The Verdict sub-step list mirrors the real `SigEvents Verdict`
 * workflow YAML the user shared, so the expanded panel reads like an
 * actual execution trace. Discovery + Detection are plausible peers
 * (the prototype doesn't have their YAML yet, so step names follow the
 * same naming conventions: snake_case verbs + `data.set` /
 * `elasticsearch.request` / `ai.agent` types).
 *
 * Verdict is `running` and has exactly one sub-step marked `running` —
 * the expanded panel auto-scrolls that step into view via a ref + scroll
 * effect. All steps before are `done`, all after are `pending`.
 * ----------------------------------------------------------------------- */

const WORKFLOWS: Workflow[] = [
  {
    id: 'discovery',
    label: 'Significant event Discovery',
    status: 'done',
    timestamp: '2 minutes ago',
    steps: [
      { id: 'd1', name: 'health_check_discoveries_stream', type: 'elasticsearch.request', status: 'done', duration: '38ms' },
      { id: 'd2', name: 'fetch_open_detections', type: 'elasticsearch.request', status: 'done', duration: '142ms' },
      { id: 'd3', name: 'compute_detection_groups', type: 'data.set', status: 'done', duration: '4ms' },
      { id: 'd4', name: 'fetch_recent_discoveries', type: 'elasticsearch.request', status: 'done', duration: '96ms' },
      { id: 'd5', name: 'compute_change_point_candidates', type: 'data.set', status: 'done', duration: '12ms' },
      { id: 'd6', name: 'score_candidates', type: 'data.set', status: 'done', duration: '7ms' },
      { id: 'd7', name: 'group_related_candidates', type: 'data.set', status: 'done', duration: '5ms' },
      { id: 'd8', name: 'propose_findings', type: 'ai.agent', status: 'done', duration: '12.4s' },
      { id: 'd9', name: 'compute_discovery_slugs', type: 'data.set', status: 'done', duration: '3ms' },
      { id: 'd10', name: 'write_discovery_docs', type: 'elasticsearch.request', status: 'done', duration: '210ms' },
      { id: 'd11', name: 'emit_clearance_when_resolved', type: 'elasticsearch.request', status: 'done', duration: '88ms' },
    ],
  },
  {
    id: 'detection',
    label: 'Significant event Detection',
    status: 'done',
    timestamp: '2 minutes ago',
    steps: [
      { id: 'dt1', name: 'health_check_detections_stream', type: 'elasticsearch.request', status: 'done', duration: '32ms' },
      { id: 'dt2', name: 'fetch_active_rules', type: 'elasticsearch.request', status: 'done', duration: '74ms' },
      { id: 'dt3', name: 'fetch_rule_executions', type: 'elasticsearch.request', status: 'done', duration: '188ms' },
      { id: 'dt4', name: 'compute_detection_signals', type: 'data.set', status: 'done', duration: '9ms' },
      { id: 'dt5', name: 'classify_detection_kind', type: 'data.set', status: 'done', duration: '6ms' },
      { id: 'dt6', name: 'dedupe_recent_detections', type: 'data.set', status: 'done', duration: '11ms' },
      { id: 'dt7', name: 'foreach_signal', type: 'foreach', status: 'done', duration: '1.1s' },
      { id: 'dt8', name: 'write_detection_doc', type: 'elasticsearch.request', status: 'done', duration: '256ms' },
      { id: 'dt9', name: 'emit_clearance_signals', type: 'elasticsearch.request', status: 'done', duration: '64ms' },
    ],
  },
  {
    id: 'verdict',
    label: 'Significant event Verdict',
    status: 'running',
    timestamp: '2 minutes ago',
    steps: [
      { id: 'v1', name: 'health_check_discoveries_stream', type: 'elasticsearch.request', status: 'done', duration: '41ms' },
      { id: 'v2', name: 'fetch_cleared_discovery_slugs', type: 'elasticsearch.request', status: 'done', duration: '54ms' },
      { id: 'v3', name: 'compute_cleared_slugs', type: 'data.set', status: 'done', duration: '2ms' },
      { id: 'v4', name: 'fetch_all_promoted_events', type: 'elasticsearch.request', status: 'done', duration: '120ms' },
      { id: 'v5', name: 'compute_promoted_context', type: 'data.set', status: 'done', duration: '4ms' },
      { id: 'v6', name: 'fetch_latest_detection_ts', type: 'elasticsearch.request', status: 'done', duration: '36ms' },
      { id: 'v7', name: 'fetch_promoted_with_cleared_signal', type: 'elasticsearch.request', status: 'done', duration: '94ms' },
      { id: 'v8', name: 'compute_cleared_signal_events', type: 'data.set', status: 'done', duration: '3ms' },
      { id: 'v9', name: 'compute_active_event_ids', type: 'data.set', status: 'done', duration: '3ms' },
      { id: 'v10', name: 'fetch_reviewed_ids', type: 'elasticsearch.request', status: 'done', duration: '47ms' },
      { id: 'v11', name: 'compute_reviewed_ids', type: 'data.set', status: 'done', duration: '2ms' },
      { id: 'v12', name: 'fetch_unreviewed_discoveries', type: 'if', status: 'done', duration: '162ms' },
      { id: 'v13', name: 'check_has_unreviewed', type: 'data.set', status: 'done', duration: '3ms' },
      { id: 'v14', name: 'fetch_cleared_unreviewed_stubs', type: 'if', status: 'done', duration: '88ms' },
      { id: 'v15', name: 'evaluate_work_needed', type: 'data.set', status: 'done', duration: '2ms' },
      { id: 'v16', name: 'fetch_detection_evidence', type: 'elasticsearch.request', status: 'done', duration: '110ms' },
      { id: 'v17', name: 'compute_active_detection_evidence', type: 'data.set', status: 'done', duration: '5ms' },
      { id: 'v18', name: 'fetch_knowledge_base', type: 'elasticsearch.request', status: 'done', duration: '78ms' },
      { id: 'v19', name: 'compute_batch', type: 'data.set', status: 'done', duration: '4ms' },
      { id: 'v20', name: 'judge_discoveries', type: 'ai.agent', status: 'running' },
      { id: 'v21', name: 'store_verdicts', type: 'data.set', status: 'pending' },
      { id: 'v22', name: 'foreach_verdict', type: 'elasticsearch.request', status: 'pending' },
      { id: 'v23', name: 'write_event_doc', type: 'elasticsearch.request', status: 'pending' },
      { id: 'v24', name: 'write_verdict_doc', type: 'elasticsearch.request', status: 'pending' },
    ],
  },
];

const WORKFLOW_STEP_TYPE_ICON: Record<WorkflowExecutionStepType, IconType> = {
  'elasticsearch.request': 'logoElasticsearch',
  'data.set': 'pipeNoBreaks',
  'ai.agent': 'productAgent',
  foreach: 'iteration',
  if: 'branch',
};

const WORKFLOW_STEP_TYPE_LABEL: Record<WorkflowExecutionStepType, string> = {
  'elasticsearch.request': 'ES request',
  'data.set': 'data.set',
  'ai.agent': 'ai.agent',
  foreach: 'foreach',
  if: 'if',
};

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
 * Approximate height of a single sub-step row in the expanded panel
 * (32px row + 1px bottom border). Used to size the scrollable area so
 * exactly 4 rows are visible — the rest live behind a vertical scroll.
 */
const EXECUTION_ROW_HEIGHT_PX = 32;
const EXECUTION_VISIBLE_ROWS = 4;
const EXECUTION_SCROLL_MAX_HEIGHT_PX = EXECUTION_ROW_HEIGHT_PX * EXECUTION_VISIBLE_ROWS;

interface WorkflowExecutionRowProps {
  step: WorkflowExecutionStep;
  isLast: boolean;
  isCurrent: boolean;
}

/**
 * One execution-step line inside the expanded workflow panel. Compact
 * (32px tall) so a handful of rows fit inside the scrollable area
 * before the rest scroll behind. Status icon on the left, monospace
 * YAML step name in the middle, type badge on the right, and an
 * optional duration trailing it.
 */
const WorkflowExecutionRow = React.forwardRef<HTMLDivElement, WorkflowExecutionRowProps>(
  ({ step, isLast, isCurrent }, ref) => {
    const { euiTheme } = useEuiTheme();
    return (
      <div
        ref={ref}
        data-test-subj={`nightshiftWorkflowExecutionStep-${step.id}`}
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
          height: ${EXECUTION_ROW_HEIGHT_PX}px;
          /* Aligns the step rows with the parent workflow header:
           * 32px left lines up with the chevron/icon column, 24px
           * right matches the trailing icon button cluster. */
          padding: 0px 24px 0 32px;
          border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
          /* Subtle primary tint on the running step so it stands out
           * against the rest of the column when the user scrolls. */
          background: ${isCurrent ? euiTheme.colors.backgroundBasePrimary : 'transparent'};
        `}
      >
        <div
          aria-hidden
          css={css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            flex-shrink: 0;
          `}
        >
          {step.status === 'done' && (
            <EuiIcon
              type="checkInCircleFilled"
              color={euiTheme.colors.textSuccess}
              size="s"
            />
          )}
          {step.status === 'running' && (
            <ShellSpinner size={12} aria-label={`${step.name} running`} />
          )}
          {step.status === 'pending' && (
            <div
              css={css`
                width: 8px;
                height: 8px;
                border-radius: 4px;
                background: ${euiTheme.colors.borderBaseSubdued};
              `}
            />
          )}
        </div>
        <EuiIcon
          type={WORKFLOW_STEP_TYPE_ICON[step.type]}
          size="s"
          color={euiTheme.colors.textSubdued}
          aria-hidden
        />
        <span
          css={css`
            flex: 1 1 0;
            min-width: 0;
            font-family: ${euiTheme.font.familyCode};
            font-size: 12px;
            line-height: 16px;
            color: ${step.status === 'pending'
              ? euiTheme.colors.textDisabled
              : euiTheme.colors.textParagraph};
            font-weight: ${isCurrent
              ? euiTheme.font.weight.semiBold
              : euiTheme.font.weight.regular};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
          title={step.name}
        >
          {step.name}
        </span>
        <EuiBadge
          color="hollow"
          css={css`
            font-family: ${euiTheme.font.familyCode};
            flex-shrink: 0;
          `}
        >
          {WORKFLOW_STEP_TYPE_LABEL[step.type]}
        </EuiBadge>
        <span
          css={css`
            min-width: 40px;
            text-align: right;
            font-size: 11px;
            color: ${euiTheme.colors.textSubdued};
            flex-shrink: 0;
          `}
        >
          {step.duration ?? (step.status === 'running' ? '…' : '')}
        </span>
      </div>
    );
  }
);

interface WorkflowExecutionPanelProps {
  workflow: Workflow;
}

/**
 * Scrollable container holding the workflow's full execution. Sized
 * to {@link EXECUTION_VISIBLE_ROWS} rows by default; the rest sit
 * behind a vertical scroll. When the workflow is currently running we
 * auto-scroll the running step into view on mount/expand so the user
 * always lands on the live step without having to scroll manually.
 */
const WorkflowExecutionPanel: React.FC<WorkflowExecutionPanelProps> = ({ workflow }) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runningStepRef = useRef<HTMLDivElement | null>(null);
  const runningStepId = useMemo(
    () => workflow.steps.find((s) => s.status === 'running')?.id,
    [workflow.steps]
  );

  /*
   * Scroll the running row into the middle of the *local* scroll
   * container only.
   *
   * `Element.scrollIntoView` walks every scrollable ancestor and
   * scrolls each of them — so when this panel was rendered far down
   * the page (e.g. the Verdict workflow at the bottom of the list)
   * the browser would scroll the entire `KibanaPageTemplate` body
   * upward to centre the row inside the viewport. The user saw that
   * as a "page jump" on expand. Setting `scrollTop` directly on the
   * local container keeps the surrounding document anchored — the
   * page only moves when the user themselves scrolls.
   */
  useEffect(() => {
    const container = containerRef.current;
    const row = runningStepRef.current;
    if (!container || !row) return;
    const target = row.offsetTop - container.clientHeight / 2 + row.clientHeight / 2;
    container.scrollTop = Math.max(0, target);
  }, [runningStepId]);

  return (
    <div
      ref={containerRef}
      data-test-subj={`nightshiftWorkflowExecution-${workflow.id}`}
      css={css`
        max-height: ${EXECUTION_SCROLL_MAX_HEIGHT_PX}px;
        overflow-y: auto;
        background: ${euiTheme.colors.backgroundBasePlain};
        border-top: ${euiTheme.border.thin};
        /* Thin, themed scrollbar so the panel doesn't show a chunky
         * platform-native one inside the otherwise quiet card. */
        scrollbar-width: thin;
        scrollbar-color: ${euiTheme.colors.borderBaseSubdued} transparent;
        &::-webkit-scrollbar {
          width: 6px;
        }
        &::-webkit-scrollbar-thumb {
          background-color: ${euiTheme.colors.borderBaseSubdued};
          border-radius: 3px;
        }
      `}
    >
      {workflow.steps.map((step, idx) => {
        const isLast = idx === workflow.steps.length - 1;
        const isCurrent = step.id === runningStepId;
        return (
          <WorkflowExecutionRow
            key={step.id}
            ref={isCurrent ? runningStepRef : undefined}
            step={step}
            isLast={isLast}
            isCurrent={isCurrent}
          />
        );
      })}
    </div>
  );
};

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
  /*
   * Per-workflow expansion state. The currently-running workflow
   * (`verdict`) starts expanded so the user lands on the live step
   * straight away — completed workflows expand on click only.
   */
  const [expandedWorkflows, setExpandedWorkflows] = useState<Record<string, boolean>>(
    () =>
      WORKFLOWS.reduce<Record<string, boolean>>((acc, workflow) => {
        acc[workflow.id] = workflow.status === 'running';
        return acc;
      }, {})
  );
  const toggleWorkflow = (id: string) =>
    setExpandedWorkflows((prev) => ({ ...prev, [id]: !prev[id] }));

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
                    <EuiButtonIcon
                      size="s"
                      color="text"
                      iconType="workflowsApp"
                      data-test-subj="nightshiftWorkflowOpenDetails"
                      onClick={() => {}}
                    >
                      {i18n.translate(
                        'xpack.observability.nightshift.loading.workflowSummary.openDetails',
                        { defaultMessage: 'Go to Workflow' }
                      )}
                    </EuiButtonIcon>
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

          {/*
           * Workflow rows — each expands to reveal the workflow's
           * execution-step list inside a scrollable panel. The whole
           * row (chevron + label + status + more) is the toggle, so
           * clicking anywhere on it flips the expansion state.
           */}
          {WORKFLOWS.map((workflow, idx) => {
            const isLast = idx === WORKFLOWS.length - 1;
            const isExpanded = expandedWorkflows[workflow.id];
            const headerId = `nightshiftWorkflowHeader-${workflow.id}`;
            const panelId = `nightshiftWorkflowExecutionPanel-${workflow.id}`;
            return (
              <div
                key={workflow.id}
                css={css`
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                  border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
                `}
                data-test-subj={`nightshiftWorkflowStep-${workflow.id}`}
                data-nightshift-workflow-expanded={isExpanded ? 'true' : 'false'}
              >
                {/* Row header — toggle target for the execution panel */}
                <button
                  id={headerId}
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => toggleWorkflow(workflow.id)}
                  data-test-subj={`nightshiftWorkflowStep-${workflow.id}-toggle`}
                  css={css`
                    /* Strip native button chrome so the row reads as
                     * the same compact strip the prototype already
                     * uses for these workflow tiles. */
                    appearance: none;
                    background: transparent;
                    border: 0;
                    width: 100%;
                    text-align: left;
                    padding: ${euiTheme.size.s} ${euiTheme.size.base};
                    cursor: pointer;
                    color: inherit;
                    &:hover {
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                    }
                    &:focus-visible {
                      outline: 2px solid ${euiTheme.colors.primary};
                      outline-offset: -2px;
                    }
                  `}
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
                          <EuiIcon
                            type={isExpanded ? 'arrowDown' : 'chevronSingleRight'}
                            size="s"
                            color="subdued"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs">
                            <strong>{workflow.label}</strong>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                        <EuiFlexItem grow={false}>
                          {workflow.status === 'done' ? (
                            <EuiIcon
                              type="checkInCircleFilled"
                              color={euiTheme.colors.textSuccess}
                              size="s"
                            />
                          ) : (
                            <ShellSpinner size={14} aria-label={`${workflow.label} running`} />
                          )}
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs" color="subdued">
                            {workflow.timestamp}
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
                                values: { step: workflow.label },
                              }
                            )}
                            /* Stop the row click handler from also
                             * toggling expansion when the user just
                             * wants the overflow menu. */
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                            }}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </button>

                {/* Expanded execution-step panel — scrollable */}
                {isExpanded && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                  >
                    <WorkflowExecutionPanel workflow={workflow} />
                  </div>
                )}
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
