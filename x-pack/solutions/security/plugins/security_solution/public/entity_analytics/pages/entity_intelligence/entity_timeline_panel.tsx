/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import type { IntelligenceEntity } from './common';
import { getAlertSeverityColor } from './common';
import { EntityTimeline } from './entity_timeline';
import type { TimelineEntityRef } from './entity_timeline';
import { RawDocumentView } from './raw_document_view';
import { buildTimelineExplainPrompt } from './ai_explain';
import type { TimelineExplainStep } from './ai_explain';
import type { TimeRangePreset } from './graph_state';
import type { TimelineModel, TimelineStep } from './timeline_model';
import { useEntityRawDocument } from './hooks/use_entity_timeline';

export interface EntityTimelinePanelProps {
  entity: IntelligenceEntity;
  timeRange: TimeRangePreset;
  /** Closes the panel (host controls visibility). */
  onClose: () => void;
  /** Wide/expanded mode using more screen real estate. */
  isExpanded: boolean;
  /** Toggles expanded mode. */
  onToggleExpanded: () => void;
  /** Hover cross-highlight → host relays to the graph. */
  onHighlightEntity?: (ref: TimelineEntityRef | undefined) => void;
  /** Focus-in-graph request from a step. */
  onFocusEntity?: (ref: TimelineEntityRef) => void;
  /** Opens the shared AI explain flyout with a prompt + subtitle. */
  onExplain?: (prompt: string, subtitle: string) => void;
  /** Entity key (`<kind>:<name>`) highlighted from the graph side. */
  highlightedEntityKey?: string;
}

/**
 * Dedicated side panel that hosts the causal timeline beside the relationship
 * graph. Wider than the dossier flyout, expandable to more width, scrolls
 * vertically, and surfaces a selected step's evidence + raw `_source` inline.
 * Cross-highlights and focus requests flow up to the host so the graph and
 * timeline stay in sync. The {@link EntityTimeline} component is reused as-is.
 */
export const EntityTimelinePanel: React.FC<EntityTimelinePanelProps> = ({
  entity,
  timeRange,
  onClose,
  isExpanded,
  onToggleExpanded,
  onHighlightEntity,
  onFocusEntity,
  onExplain,
  highlightedEntityKey,
}) => {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;
  const [selectedStep, setSelectedStep] = useState<TimelineStep | undefined>();
  const [rawStep, setRawStep] = useState<TimelineStep | undefined>();
  const [timelineModel, setTimelineModel] = useState<TimelineModel | undefined>();
  const rawFlyoutTitleId = useGeneratedHtmlId({ prefix: 'entityIntelligenceRawFlyout' });

  const {
    source: rawSource,
    isLoading: isRawLoading,
    isError: isRawError,
  } = useEntityRawDocument(rawStep ? { id: rawStep.refId, index: rawStep.refIndex } : undefined);

  // Reset transient selection whenever the focus entity changes.
  useEffect(() => {
    setSelectedStep(undefined);
    setRawStep(undefined);
  }, [entity.id]);

  const runExplain = useCallback(() => {
    const steps = timelineModel?.steps ?? [];
    const explainSteps: TimelineExplainStep[] = steps.slice(0, 24).map((step) => ({
      time: new Date(step.timestamp).toISOString(),
      kind: step.kind,
      label: step.label,
      category: step.category,
      severity: step.severity,
      tactic: step.tacticName,
      tiedToAlert: step.contributedToAlertId !== undefined,
      depth: step.depth,
    }));
    onExplain?.(
      buildTimelineExplainPrompt({
        focusName: entity.name,
        focusKind: entity.type,
        timeRange,
        totalSignificant: timelineModel?.totalSignificant ?? explainSteps.length,
        steps: explainSteps,
      }),
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineExplainSubtitle',
        { defaultMessage: 'Causal timeline · {name}', values: { name: entity.name } }
      )
    );
  }, [entity.name, entity.type, onExplain, timeRange, timelineModel]);

  const investigateStep = useCallback(
    (step: TimelineStep) => {
      agentBuilder?.openChat({
        newConversation: true,
        initialMessage: `Investigate this activity on ${entity.type} "${entity.name}": "${
          step.label
        }" at ${new Date(
          step.timestamp
        ).toISOString()}. Explain what happened and whether it is malicious.`,
        autoSendInitialMessage: false,
        sessionTag: 'security',
      });
    },
    [agentBuilder, entity.name, entity.type]
  );

  const nameStyle = css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: ${euiTheme.size.base};
      `}
      data-test-subj="entityIntelligenceTimelinePanel"
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
          margin-bottom: ${euiTheme.size.s};
        `}
      >
        <EuiIcon type={EntityIconByType[entity.type]} size="m" color="primary" aria-hidden={true} />
        <EuiTitle size="xxs">
          <h3 css={nameStyle} title={entity.name}>
            {entity.name}
          </h3>
        </EuiTitle>
        <div
          css={css`
            margin-left: auto;
            display: flex;
            gap: ${euiTheme.size.xs};
          `}
        >
          <EuiToolTip
            disableScreenReaderOutput
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineExplainButton',
              { defaultMessage: 'Explain this timeline' }
            )}
          >
            <EuiButtonIcon
              iconType="sparkles"
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineExplainButton',
                { defaultMessage: 'Explain this timeline' }
              )}
              onClick={runExplain}
              data-test-subj="entityIntelligenceTimelineExplainButton"
            />
          </EuiToolTip>
          <EuiToolTip
            disableScreenReaderOutput
            content={
              isExpanded
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineCollapseWidth',
                    { defaultMessage: 'Collapse timeline width' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineExpandWidth',
                    { defaultMessage: 'Expand timeline' }
                  )
            }
          >
            <EuiButtonIcon
              iconType={isExpanded ? 'menuRight' : 'menuLeft'}
              aria-label={
                isExpanded
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineCollapseWidth',
                      { defaultMessage: 'Collapse timeline width' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineExpandWidth',
                      { defaultMessage: 'Expand timeline' }
                    )
              }
              onClick={onToggleExpanded}
              data-test-subj="entityIntelligenceTimelineExpandToggle"
            />
          </EuiToolTip>
          <EuiToolTip
            disableScreenReaderOutput
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelinePanelClose',
              { defaultMessage: 'Close timeline' }
            )}
          >
            <EuiButtonIcon
              iconType="cross"
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelinePanelClose',
                { defaultMessage: 'Close timeline' }
              )}
              onClick={onClose}
            />
          </EuiToolTip>
        </div>
      </div>

      <div
        css={css`
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding-right: ${euiTheme.size.xs};
        `}
      >
        <EntityTimeline
          entity={entity}
          timeRange={timeRange}
          onStepSelect={setSelectedStep}
          selectedStepId={selectedStep?.id}
          onStepHighlight={onHighlightEntity}
          onStepFocus={onFocusEntity}
          onStepViewRaw={setRawStep}
          highlightedEntityKey={highlightedEntityKey}
          expanded={isExpanded}
          onModelChange={setTimelineModel}
        />

        {selectedStep ? (
          <>
            <div
              css={css`
                height: ${euiTheme.size.base};
              `}
            />
            <EuiPanel hasBorder paddingSize="s" data-test-subj="entityIntelligenceTimelineEvidence">
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={getAlertSeverityColor(euiTheme, selectedStep.severity)}>
                    {selectedStep.kind === 'alert'
                      ? i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineEvidenceAlert',
                          { defaultMessage: 'Alert' }
                        )
                      : i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineEvidenceEvent',
                          { defaultMessage: 'Event' }
                        )}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <PreferenceFormattedDate value={new Date(selectedStep.timestamp)} />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow>
                  <div
                    css={css`
                      display: flex;
                      justify-content: flex-end;
                    `}
                  >
                    <EuiButtonEmpty
                      size="xs"
                      iconType="cross"
                      onClick={() => setSelectedStep(undefined)}
                    >
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineEvidenceClose',
                        { defaultMessage: 'Close' }
                      )}
                    </EuiButtonEmpty>
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
              <div
                css={css`
                  height: ${euiTheme.size.xs};
                `}
              />
              <EuiText size="s">
                <strong>{selectedStep.label}</strong>
              </EuiText>
              {selectedStep.detail ? (
                <EuiText size="xs" color="subdued">
                  <span
                    css={css`
                      overflow-wrap: anywhere;
                    `}
                  >
                    {selectedStep.detail}
                  </span>
                </EuiText>
              ) : null}
              <div
                css={css`
                  height: ${euiTheme.size.xs};
                `}
              />
              <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="inspect"
                    onClick={() => setRawStep(selectedStep)}
                    data-test-subj="entityIntelligenceTimelineViewRawSelected"
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineEvidenceViewRaw',
                      { defaultMessage: 'View raw event' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="comment"
                    onClick={() => investigateStep(selectedStep)}
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineEvidenceHunt',
                      { defaultMessage: 'Investigate in AI chat' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </>
        ) : null}
      </div>

      {rawStep ? (
        <EuiFlyout
          ownFocus
          size="m"
          onClose={() => setRawStep(undefined)}
          aria-labelledby={rawFlyoutTitleId}
          data-test-subj="entityIntelligenceRawFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="document" size="m" color="subdued" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiTitle size="s">
                  <h2 id={rawFlyoutTitleId}>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineRawTitle',
                      { defaultMessage: 'Raw document' }
                    )}
                  </h2>
                </EuiTitle>
                <EuiText size="xs" color="subdued">
                  <span
                    css={css`
                      overflow-wrap: anywhere;
                    `}
                  >
                    {`${rawStep.refIndex ?? '—'} · ${rawStep.refId}`}
                  </span>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {isRawLoading ? (
              <EuiLoadingSpinner size="m" />
            ) : isRawError || rawSource === undefined ? (
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineRawUnavailable',
                    { defaultMessage: 'The raw document could not be loaded.' }
                  )}
                </p>
              </EuiText>
            ) : (
              <RawDocumentView source={rawSource} expanded={isExpanded} />
            )}
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </div>
  );
};
