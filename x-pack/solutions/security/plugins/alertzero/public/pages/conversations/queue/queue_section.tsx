/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  ConversationQueue,
  matchesEntityFilter,
  type BaseActionsProps,
  type ConversationsActionsGroupProps,
  type Investigation,
} from '@kbn/agentic-investigations-common';
import { proposalOutcome } from '../proposal_outcome';
import type { QueueSection as QueueSectionState } from './use_queue_section';

export interface QueueSectionProps {
  section: QueueSectionState;
  entityFilter: string | null;
  /** Conversation behind the open flyout; its cards are marked as current. */
  selectedConversationId?: string;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'];
  getChatHref: (id: Investigation['id']) => string | undefined;
  canManageEscalations?: boolean;
  /** Optional: render the assignee picker widget for each non-closed card. */
  renderAssignees: (investigation: Investigation) => React.ReactNode;
}

export const QueueSection = ({
  section,
  entityFilter,
  selectedConversationId,
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
    hasLoadMoreError,
    hasCountError,
    retry,
    remaining,
    canLoadMore,
    loadMore,
    isLoadingMore,
  } = section;

  const briefingList = useMemo(
    () =>
      entityFilter
        ? investigations.filter((investigation) => matchesEntityFilter(investigation, entityFilter))
        : investigations,
    [investigations, entityFilter]
  );

  const selectedIds = useMemo(
    () =>
      selectedConversationId
        ? proposals
            .filter(({ conversationId }) => conversationId === selectedConversationId)
            .map(({ id: proposalId }) => proposalId)
        : [],
    [proposals, selectedConversationId]
  );

  // Read off the raw proposals: the adapted Investigation carries no decision.
  const outcomes = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposalOutcome(proposal)])),
    [proposals]
  );
  const getOutcomeLabel = useCallback((proposalId: string) => outcomes.get(proposalId), [outcomes]);

  return (
    <ConversationQueue
      briefingType={id}
      briefingList={briefingList}
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
      {...handlers}
    />
  );
};
