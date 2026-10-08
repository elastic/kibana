/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FinalResults, ImpactSection } from '@kbn/investigation-output';
import type {
  InvestigationImpact,
  InvestigationState,
  Severity,
} from '@kbn/significant-events-schema';
import {
  DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID,
  type GetInvestigationResponse,
} from '../../common';
import { InvestigationRunStatusBadge } from './investigation_run_status_badge';
import { formatDate, formatDuration } from './utils';
import type { DecisionTreeTrigger } from './decision_tree/build_decision_graph';
import { DecisionTreeCard } from './decision_tree/decision_tree_card';

const LazyInvestigationVisualiserFlyout = React.lazy(async () => {
  const { InvestigationVisualiserFlyout } = await import(
    './decision_tree/investigation_visualiser_flyout'
  );
  return { default: InvestigationVisualiserFlyout };
});

/**
 * Bridges `GetInvestigationResponse` (where `summary` and `hypotheses` are optional —
 * they may not yet exist mid-run) to `InvestigationState` (which requires both), filling
 * the gaps from the live progress snapshot while the agent is still streaming.
 *
 * The record is only written once the run ends, so mid-run every field falls through to
 * `progress`; once persisted, the record wins so a late-arriving snapshot can't overwrite
 * the final result. Defaults are safe: an empty summary shows nothing; empty hypotheses
 * render nothing.
 */
function toInvestigationState(
  inv: GetInvestigationResponse,
  progress?: InvestigationState
): InvestigationState {
  return {
    title: inv.title,
    summary: inv.summary ?? progress?.summary ?? '',
    hypotheses: inv.hypotheses ?? progress?.hypotheses ?? [],
    conclusion: inv.conclusion ?? progress?.conclusion,
    severity: inv.severity ?? progress?.severity,
    recommendations: inv.recommendations ?? progress?.recommendations,
    impact: inv.impact ?? progress?.impact,
  };
}

const hasImpact = (impact?: InvestigationImpact): impact is InvestigationImpact =>
  Boolean(impact?.summary?.trim() || impact?.evidence || impact?.entities?.length);

const SEVERITY_BADGES: Record<Severity, { color: string; label: string }> = {
  critical: {
    color: 'danger',
    label: i18n.translate('xpack.nightshiftInvestigations.flyout.severityCritical', {
      defaultMessage: 'Critical',
    }),
  },
  high: {
    color: 'warning',
    label: i18n.translate('xpack.nightshiftInvestigations.flyout.severityHigh', {
      defaultMessage: 'High',
    }),
  },
  medium: {
    // Matches the severity dot color on the Nightshift landing page (`SEVERITY_DOT_COLOR`).
    color: 'primary',
    label: i18n.translate('xpack.nightshiftInvestigations.flyout.severityMedium', {
      defaultMessage: 'Medium',
    }),
  },
  low: {
    // Matches the severity dot color on the Nightshift landing page (`SEVERITY_DOT_COLOR`).
    color: 'success',
    label: i18n.translate('xpack.nightshiftInvestigations.flyout.severityLow', {
      defaultMessage: 'Low',
    }),
  },
};

const isInvestigationRunning = (inv: GetInvestigationResponse): boolean =>
  inv.status === 'pending' || inv.status === 'running';

/**
 * Whether the subject points at something worth showing. A manual run is defined by its prompt,
 * not by an entity, so when the caller named no subject the placeholder id would render against
 * its own type as "manual — manual" — and the prompt is already the flyout's headline.
 */
const hasSubjectWorthShowing = (inv: GetInvestigationResponse): boolean =>
  !(inv.subject.type === 'manual' && inv.subject.id === DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID);

/** The title is seeded from the trigger, so it names the trigger when the subject carries no summary. */
const toDecisionTreeTrigger = (inv: GetInvestigationResponse): DecisionTreeTrigger => ({
  type: inv.subject.type,
  name: inv.subject.summary?.trim() || inv.title,
});

export interface InvestigationDetailFlyoutProps {
  investigation: GetInvestigationResponse | null;
  isLoading: boolean;
  error: Error | null;
  onClose: () => void;
  /** Pass-through to EuiFlyout; use to add share URL, EBT tracking, etc. */
  flyoutMenuProps?: ComponentProps<typeof EuiFlyout>['flyoutMenuProps'];
  onClickCapture?: React.MouseEventHandler<HTMLElement>;
  /**
   * Optional: latest snapshot streamed by the running agent. Fills in summary, hypotheses
   * and conclusion before the workflow persists them, so a live run shows its progress
   * instead of an empty body.
   */
  progress?: InvestigationState;
}

function SectionTitle({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <EuiTitle size="xs">
      <h3>{children}</h3>
    </EuiTitle>
  );
}

export function InvestigationDetailFlyout({
  investigation,
  isLoading,
  error,
  onClose,
  flyoutMenuProps,
  onClickCapture,
  progress,
}: InvestigationDetailFlyoutProps): React.ReactElement {
  const primaryText = investigation
    ? investigation.title
    : i18n.translate('xpack.nightshiftInvestigations.flyout.loading', {
        defaultMessage: 'Loading…',
      });

  const invState = useMemo(
    () => (investigation ? toInvestigationState(investigation, progress) : undefined),
    [investigation, progress]
  );
  const trigger = useMemo(
    () => (investigation ? toDecisionTreeTrigger(investigation) : undefined),
    [investigation]
  );
  const isRunning = investigation ? isInvestigationRunning(investigation) : false;
  // One history group per flyout instance, so the visualiser's Back returns to this flyout.
  const [historyKey] = useState(() => Symbol('nightshiftInvestigationDetailFlyout'));
  const [isVisualiserOpen, setIsVisualiserOpen] = useState(false);
  const openVisualiser = useCallback(() => setIsVisualiserOpen(true), []);
  const closeVisualiser = useCallback(() => setIsVisualiserOpen(false), []);

  const renderBody = () => {
    if (isLoading && !investigation) {
      return (
        <EuiFlexGroup justifyContent="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (error && !investigation) {
      return (
        <EuiCallOut
          announceOnMount
          color="warning"
          size="s"
          title={i18n.translate('xpack.nightshiftInvestigations.flyout.loadError', {
            defaultMessage: 'Unable to load investigation',
          })}
        />
      );
    }

    if (!investigation || !invState) {
      return null;
    }

    const hasFindings = Boolean(invState.summary) || invState.hypotheses.length > 0;
    const hasSubject = hasSubjectWorthShowing(investigation);
    const decisionTreeCard = invState.hypotheses.length > 0 && (
      <DecisionTreeCard
        hypothesisCount={invState.hypotheses.length}
        isRunning={isRunning}
        onOpen={openVisualiser}
      />
    );

    return (
      <>
        {invState.summary && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.nightshiftInvestigations.flyout.whatHappenedTitle', {
                defaultMessage: 'What happened',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <div data-test-subj="nightshiftInvestigationDetailFlyoutSummary">
              <EuiMarkdownFormat textSize="s" color="default">
                {invState.summary}
              </EuiMarkdownFormat>
            </div>
            <EuiSpacer size="l" />
          </>
        )}

        {hasImpact(invState.impact) && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.nightshiftInvestigations.flyout.impactTitle', {
                defaultMessage: 'Impact',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <ImpactSection impact={invState.impact} />
            <EuiSpacer size="l" />
          </>
        )}

        {isRunning && !hasFindings && (
          <>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              data-test-subj="nightshiftInvestigationDetailFlyoutProgressPending"
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.nightshiftInvestigations.flyout.investigatingLabel', {
                    defaultMessage: 'Investigating…',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        {/* A mid-run conclusion is still a draft, so it is held back until the run ends. */}
        {isRunning ? (
          decisionTreeCard && (
            <>
              {decisionTreeCard}
              <EuiSpacer size="l" />
            </>
          )
        ) : (
          <>
            <FinalResults
              state={invState}
              showConclusionTitle
              conclusionMaxLines={4}
              afterConclusion={decisionTreeCard}
            />
            <EuiSpacer size="l" />
          </>
        )}

        {hasSubject && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.nightshiftInvestigations.flyout.subjectTitle', {
                defaultMessage: 'Subject',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                <span>{investigation.subject.type}</span>
                {' — '}
                <span
                  className="eui-textTruncate"
                  title={investigation.subject.id}
                  css={css`
                    display: inline-block;
                    max-width: 100%;
                    vertical-align: bottom;
                  `}
                >
                  {investigation.subject.id}
                </span>
              </p>
            </EuiText>
            <EuiSpacer size="l" />
          </>
        )}

        <SectionTitle>
          {i18n.translate('xpack.nightshiftInvestigations.flyout.runDetailsTitle', {
            defaultMessage: 'Run details',
          })}
        </SectionTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          {investigation.executed_by && (
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.nightshiftInvestigations.flyout.executedBy', {
                  defaultMessage: 'Started by {executedBy}',
                  values: { executedBy: investigation.executed_by },
                })}
              </EuiText>
            </EuiFlexItem>
          )}
          {investigation.started_at && (
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {investigation.completed_at
                  ? i18n.translate('xpack.nightshiftInvestigations.flyout.ranFor', {
                      defaultMessage: '{start} — ran for {duration}',
                      values: {
                        start: formatDate(investigation.started_at),
                        duration: formatDuration(
                          investigation.started_at,
                          investigation.completed_at
                        ),
                      },
                    })
                  : i18n.translate('xpack.nightshiftInvestigations.flyout.startedAt', {
                      defaultMessage: 'Started {start}',
                      values: { start: formatDate(investigation.started_at) },
                    })}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {investigation.status === 'failed' && investigation.error && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.translate('xpack.nightshiftInvestigations.flyout.failedTitle', {
                defaultMessage: 'Investigation failed',
              })}
            >
              <EuiText size="s">{investigation.error}</EuiText>
            </EuiCallOut>
          </>
        )}
      </>
    );
  };

  return (
    <>
      <EuiFlyout
        aria-label={primaryText}
        data-test-subj="nightshiftInvestigationDetailFlyout"
        flyoutMenuProps={flyoutMenuProps}
        onClickCapture={onClickCapture}
        onClose={onClose}
        resizable
        session="start"
        historyKey={historyKey}
        size="s"
        type="push"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2>{primaryText}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          {investigation && (
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <InvestigationRunStatusBadge status={investigation.status} />
              </EuiFlexItem>
              {investigation.severity && (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={SEVERITY_BADGES[investigation.severity].color}
                    data-test-subj="nightshiftInvestigationDetailFlyoutSeverity"
                  >
                    {SEVERITY_BADGES[investigation.severity].label}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="xs">
            {investigation ? formatDate(investigation.created_at) : ''}
          </EuiText>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      </EuiFlyout>
      {isVisualiserOpen && trigger && invState && (
        <Suspense fallback={null}>
          <LazyInvestigationVisualiserFlyout
            trigger={trigger}
            state={invState}
            isRunning={isRunning}
            historyKey={historyKey}
            onClose={closeVisualiser}
          />
        </Suspense>
      )}
    </>
  );
}
