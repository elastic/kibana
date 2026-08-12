/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import type { InvestigationStatus } from '@kbn/investigation-output';
import type { InvestigationState } from '@kbn/significant-events-schema';
import { i18n } from '@kbn/i18n';
import { buildRecommendationChatOptions } from './open_investigation_item_in_chat';
import { useKibana } from '../hooks/use_kibana';
import { InvestigationItemChatButton } from './investigation_item_chat_button';
import { BlindSpotsTable } from './blind_spots_table';
import { InvestigationCompleteStatus, InvestigatingStatusDots } from './investigation_status_badge';
import { InvestigationFormattedText } from './investigation_formatted_text';
import { TruncatableSummary } from '../common/truncatable_summary';
import { createFadeOverlayBackground } from '../common/fade_overlay_background';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { nightshiftOpacityTransition, nightshiftReducedMotionStyles } from '../common/transition';
import {
  getConclusionBody,
  getInvestigationGoalText,
  getInvestigationHeadline,
  getInvestigationWorkflowStatusLabel,
  getInvestigationTimeLabel,
  isInvestigationInvestigated,
  isInvestigationTerminalFailure,
  getPrimaryRecommendation,
  mapBlindSpots,
  type InvestigationRecommendation,
} from './investigation_presentation';

const INLINE_BLIND_SPOT_LIMIT = 4;
const tryNextRowActionClassName = 'nightshiftInvestigationTryNextRowAction';

const recommendationChatTooltip = i18n.translate(
  'xpack.nightshift.investigation.recommendationChatTooltip',
  {
    defaultMessage: 'Ask agent about this recommendation',
  }
);

const completedStatusLabel = i18n.translate(
  'xpack.nightshift.investigation.summaryCompleteStatusLabel',
  {
    defaultMessage: 'Complete',
  }
);

function InvestigationStatusRow({
  status,
  startedAt,
  endedAt,
  isRunning,
}: {
  status: InvestigationStatus;
  startedAt: string;
  endedAt?: number | string;
  isRunning: boolean;
}): React.ReactElement {
  const isInvestigated = isInvestigationInvestigated(status);
  const isTerminalFailure = isInvestigationTerminalFailure(status);
  const statusLabel = getInvestigationWorkflowStatusLabel(status);
  const timeLabel = getInvestigationTimeLabel({
    startedAt,
    endedAt,
    isRunning,
  });

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow={false}>
        {isInvestigated ? (
          <EuiTitle size="xxs">
            <h4>
              <InvestigationCompleteStatus
                label={completedStatusLabel}
                testSubj="nightshiftInvestigationStatusIcon"
              />
            </h4>
          </EuiTitle>
        ) : isTerminalFailure ? (
          <EuiTitle size="xxs">
            <h4>{statusLabel}</h4>
          </EuiTitle>
        ) : (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <InvestigatingStatusDots testSubj="nightshiftInvestigationStatusSpinner" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h4>{statusLabel}</h4>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="nightshiftInvestigationTimeLabel">
          {timeLabel}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function TryNextPanel({
  recommendation,
  onShowMoreRecommendations,
}: {
  recommendation: InvestigationRecommendation;
  onShowMoreRecommendations?: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;

  const openRecommendationInChat = useCallback(() => {
    agentBuilder?.openChat(buildRecommendationChatOptions(recommendation, 'nightshift-try-next'));
  }, [agentBuilder, recommendation]);
  const shouldShowChatAction = Boolean(agentBuilder);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="nightshiftInvestigationTryNextPanel">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.nightshift.investigation.tryNextTitle', {
                defaultMessage: 'Try next',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        {onShowMoreRecommendations && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              color="primary"
              data-test-subj="nightshiftInvestigationMoreRecommendationsLink"
              onClick={onShowMoreRecommendations}
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.VIEW_INVESTIGATION,
                element: NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATION_SUMMARY,
              })}
            >
              {i18n.translate('xpack.nightshift.investigation.moreRecommendations', {
                defaultMessage: 'More recommendations',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      <div
        css={css`
          position: relative;
          width: 100%;

          ${shouldShowChatAction
            ? `
          &:hover .${tryNextRowActionClassName}, &:focus-within .${tryNextRowActionClassName} {
            opacity: 1;
            pointer-events: auto;
          }`
            : ''}
        `}
      >
        <InvestigationFormattedText text={recommendation.title} bold />
        {recommendation.description && (
          <>
            <EuiSpacer size="xs" />
            <TruncatableSummary
              summary={recommendation.description}
              testSubj="nightshiftInvestigationTryNextPreview"
              toggleTestSubj="nightshiftInvestigationTryNextPreviewToggle"
            />
          </>
        )}
        {recommendation.code && (
          <>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="shell" isCopyable fontSize="s">
              {recommendation.code}
            </EuiCodeBlock>
          </>
        )}
        {shouldShowChatAction && (
          <div
            className={tryNextRowActionClassName}
            css={css`
              align-items: flex-start;
              background: ${createFadeOverlayBackground(euiTheme.colors.backgroundBasePlain)};
              display: flex;
              opacity: 0;
              padding-left: ${euiTheme.size.xl};
              pointer-events: none;
              position: absolute;
              right: 0;
              top: 0;
              transition: ${nightshiftOpacityTransition(euiTheme)};

              @media (prefers-reduced-motion: reduce) {
                opacity: 1;
                pointer-events: auto;
              }

              ${nightshiftReducedMotionStyles}
            `}
          >
            <InvestigationItemChatButton
              ebtElement={NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATION_SUMMARY}
              tooltip={recommendationChatTooltip}
              testSubj="nightshiftInvestigationTryNextChatButton"
              onClick={openRecommendationInChat}
            />
          </div>
        )}
      </div>
    </EuiPanel>
  );
}

export interface InvestigationSummaryCardProps {
  eventTitle: string;
  status: InvestigationStatus;
  state?: InvestigationState;
  error?: string;
  startedAt: string;
  completedAt?: string;
  onShowMoreRecommendations?: () => void;
}

export function InvestigationSummaryCard({
  eventTitle,
  status,
  state,
  error,
  startedAt,
  completedAt,
  onShowMoreRecommendations,
}: InvestigationSummaryCardProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const isRunning = status === 'running' || status === 'loading';
  const headline = getInvestigationHeadline({ eventTitle, state, status });
  const goalText = getInvestigationGoalText(state);
  const conclusionBody = getConclusionBody(state?.conclusion);
  const primaryRecommendation = status === 'complete' ? getPrimaryRecommendation(state) : undefined;
  const blindSpots =
    status === 'complete' ? mapBlindSpots(state?.gaps_found).slice(0, INLINE_BLIND_SPOT_LIMIT) : [];

  return (
    <>
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="nightshiftInvestigationSummaryCard"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
      >
        <InvestigationStatusRow
          status={status}
          startedAt={startedAt}
          endedAt={completedAt}
          isRunning={isRunning}
        />

        {(status === 'complete' || isRunning || error) && (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiTitle size="xxs">
              <h4 data-test-subj="nightshiftInvestigationHeadline">{headline}</h4>
            </EuiTitle>

            {status === 'complete' && conclusionBody && (
              <>
                <EuiSpacer size="s" />
                <TruncatableSummary
                  summary={conclusionBody}
                  testSubj="nightshiftInvestigationConclusionPreview"
                  toggleTestSubj="nightshiftInvestigationConclusionPreviewToggle"
                />
              </>
            )}

            {isRunning && goalText && (
              <>
                <EuiSpacer size="s" />
                <TruncatableSummary
                  summary={goalText}
                  testSubj="nightshiftInvestigationGoalPreview"
                  toggleTestSubj="nightshiftInvestigationGoalPreviewToggle"
                />
              </>
            )}

            {error && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="s" color="danger" data-test-subj="nightshiftInvestigationError">
                  {error}
                </EuiText>
              </>
            )}
          </>
        )}
      </EuiPanel>

      {status === 'complete' && primaryRecommendation && (
        <>
          <EuiSpacer size="s" />
          <TryNextPanel
            recommendation={primaryRecommendation}
            onShowMoreRecommendations={onShowMoreRecommendations}
          />
        </>
      )}

      {status === 'complete' && blindSpots.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <BlindSpotsTable
            items={blindSpots}
            showTitle
            testSubj="nightshiftInvestigationBlindSpotsPanel"
          />
        </>
      )}
    </>
  );
}
