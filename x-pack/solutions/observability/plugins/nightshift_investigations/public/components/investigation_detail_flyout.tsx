/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
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
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  EvidenceMarkdown,
  FinalResults,
  HypothesisRow,
  ImpactSection,
  TimelineSection,
} from '@kbn/investigation-output';
import type { InvestigationState, Severity } from '@kbn/significant-events-schema';
import {
  DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID,
  type GetInvestigationResponse,
} from '../../common';
import { InvestigationRunStatusBadge } from './investigation_run_status_badge';
import { formatDate, formatDuration } from './utils';

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
    blind_spots: inv.blind_spots ?? progress?.blind_spots,
    impact: inv.impact ?? progress?.impact,
    timeline: inv.timeline ?? progress?.timeline,
  };
}

const SEVERITY_BADGES: Record<Severity, { color: string; label: string }> = {
  '80-critical': {
    color: 'danger',
    label: i18n.translate('xpack.nightshiftInvestigations.flyout.severityCritical', {
      defaultMessage: 'Critical',
    }),
  },
  '60-high': {
    color: 'warning',
    label: i18n.translate('xpack.nightshiftInvestigations.flyout.severityHigh', {
      defaultMessage: 'High',
    }),
  },
  '40-medium': {
    color: 'accent',
    label: i18n.translate('xpack.nightshiftInvestigations.flyout.severityMedium', {
      defaultMessage: 'Medium',
    }),
  },
  '20-low': {
    color: 'default',
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

    if (!investigation) {
      return null;
    }

    const invState = toInvestigationState(investigation, progress);
    const isRunning = isInvestigationRunning(investigation);
    const hasFindings = Boolean(invState.summary) || invState.hypotheses.length > 0;
    const hasSubject = hasSubjectWorthShowing(investigation);

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
              <EvidenceMarkdown textSize="s" color="default">
                {invState.summary}
              </EvidenceMarkdown>
            </div>
            <EuiSpacer size="l" />
          </>
        )}

        {invState.impact && (invState.impact.summary || invState.impact.entities.length > 0) && (
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
        {!isRunning && (
          <>
            <FinalResults state={invState} showConclusionTitle />
            <EuiSpacer size="l" />
          </>
        )}

        {invState.hypotheses.length > 0 && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.nightshiftInvestigations.flyout.investigationTraceTitle', {
                defaultMessage: 'Investigation',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              {invState.hypotheses.map((hypothesis, index) => (
                <EuiFlexItem key={`${hypothesis.candidate}-${index}`}>
                  <HypothesisRow hypothesis={hypothesis} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        {invState.timeline && invState.timeline.length > 0 && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.nightshiftInvestigations.flyout.timelineTitle', {
                defaultMessage: 'Timeline',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <TimelineSection timeline={invState.timeline} />
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
    <EuiFlyout
      aria-label={primaryText}
      data-test-subj="nightshiftInvestigationDetailFlyout"
      flyoutMenuProps={flyoutMenuProps}
      onClickCapture={onClickCapture}
      onClose={onClose}
      resizable
      session="start"
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
  );
}
