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
import { investigationOutcome } from '../investigation_outcome';
import { queueCardId } from '../investigation_queue_item_to_investigation';
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
  selectedConversationId,
  ...handlers
}: QueueSectionProps) => {
  const {
    investigations,
    items,
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
        ? items
            .filter(({ id: conversationId }) => conversationId === selectedConversationId)
            .map(queueCardId)
        : [],
    [items, selectedConversationId]
  );

  // Read off the raw rows: the adapted Investigation carries no close reason.
  const outcomes = useMemo(
    () => new Map(items.map((item) => [queueCardId(item), investigationOutcome(item)])),
    [items]
  );
  const getOutcomeLabel = useCallback((cardId: string) => outcomes.get(cardId), [outcomes]);

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
