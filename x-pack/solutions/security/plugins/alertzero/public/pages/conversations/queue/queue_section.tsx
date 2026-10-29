/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  ConversationQueue,
  type BaseActionsProps,
  type ConversationsActionsGroupProps,
  type Investigation,
} from '@kbn/agentic-investigations-common';
import { proposalOutcome } from '../proposal_outcome';
import {
  ALERTZERO_UI_EVENTS,
  classifyError,
  useAlertZeroTelemetry,
  useReportErrorShown,
} from '../../../telemetry';
import type { QueueSection as QueueSectionState } from './use_queue_section';

export interface QueueSectionProps {
  section: QueueSectionState;
  entityFilter: string | null;
  /** Proposal whose card opened the flyout; only that card is marked as current. */
  selectedProposalId?: string;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  canOpenInvestigationDetails?: boolean;
  onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'];
  getChatHref: (id: Investigation['id']) => string | undefined;
  canManageEscalations?: boolean;
  /** When true the "Close investigation" action is shown on each card. */
  canCloseInvestigation?: boolean;
  /** Optional: render the assignee picker widget for each non-closed card. */
  renderAssignees: (investigation: Investigation) => React.ReactNode;
  onCopyLink: (id: Investigation['id']) => void;
  renderInFlightStatus?: (investigation: Investigation) => React.ReactNode;
}

export const QueueSection = ({
  section,
  entityFilter,
  selectedProposalId,
  onClickCard,
  ...handlers
}: QueueSectionProps) => {
  const {
    investigations,
    proposals,
    total,
    id,
    isOpen,
    onToggle,
    loadingRows,
    hasLoadError,
    loadError,
    isRefetchingRows,
    hasLoadMoreError,
    loadMoreError,
    hasCountError,
    retry,
    remaining,
    canLoadMore,
    loadMore,
    isLoadingMore,
  } = section;

  const selectedIds = useMemo(
    () => (selectedProposalId ? [selectedProposalId] : []),
    [selectedProposalId]
  );

  // Read off the raw proposals: the adapted Investigation carries no decision.
  const outcomes = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposalOutcome(proposal)])),
    [proposals]
  );
  const getOutcomeLabel = useCallback((proposalId: string) => outcomes.get(proposalId), [outcomes]);

  useReportErrorShown({
    errorClass: classifyError(loadError),
    isShown: hasLoadError,
    isRefetching: isRefetchingRows,
    resetKey: entityFilter ?? undefined,
    surface: 'queue',
  });
  // Each Show more click clears the failure first, so a retry that fails again is a new report.
  useReportErrorShown({
    errorClass: classifyError(loadMoreError),
    isShown: hasLoadMoreError,
    surface: 'queue',
  });

  // Only a click reaches here: a copied link or the URL opens the flyout without a card.
  const { reportEvent } = useAlertZeroTelemetry();
  const onClickBriefCard = useCallback(
    (proposalId: Investigation['id']) => {
      const position = investigations.findIndex((investigation) => investigation.id === proposalId);
      // A card is rendered from this list, so it is always found; a miss reports nothing rather
      // than a `-1` position.
      if (position >= 0) {
        reportEvent(ALERTZERO_UI_EVENTS.BriefCardClicked, {
          conversation_type: 'investigation',
          has_pending_proposal:
            proposals.find((proposal) => proposal.id === proposalId)?.status === 'pending',
          position_in_list: position,
          section: id,
        });
      }
      onClickCard(proposalId);
    },
    [id, investigations, onClickCard, proposals, reportEvent]
  );

  return (
    <ConversationQueue
      briefingType={id}
      briefingList={investigations}
      count={total}
      isOpen={isOpen}
      onToggle={onToggle}
      loadingRows={loadingRows}
      isError={hasLoadError}
      isCountUnavailable={hasCountError}
      onRetry={retry}
      remaining={canLoadMore ? remaining : 0}
      onShowMore={loadMore}
      isLoadingMore={isLoadingMore}
      hasLoadMoreError={hasLoadMoreError}
      isFiltered={Boolean(entityFilter)}
      selectedIds={selectedIds}
      getOutcomeLabel={getOutcomeLabel}
      onClickCard={onClickBriefCard}
      {...handlers}
    />
  );
};
