/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  ConversationQueue,
  type BaseActionsProps,
  type ConversationsActionsGroupProps,
  type Investigation,
} from '@kbn/agentic-investigations-common';
import type { QueueSection as QueueSectionState } from './use_queue_section';

export interface QueueSectionProps {
  section: QueueSectionState;
  surfaceFilter: string | null;
  /** Conversation behind the open flyout; its cards are marked as current. */
  selectedConversationId?: string;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'];
  getChatHref: (id: Investigation['id']) => string | undefined;
}

export const QueueSection = ({
  section,
  surfaceFilter,
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
    remaining,
    canLoadMore,
    loadMore,
    isLoadingMore,
  } = section;

  const briefingList = useMemo(
    () =>
      surfaceFilter
        ? investigations.filter(({ affectedSurface }) => affectedSurface === surfaceFilter)
        : investigations,
    [investigations, surfaceFilter]
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

  return (
    <ConversationQueue
      briefingType={id}
      briefingList={briefingList}
      count={total}
      isOpen={isOpen}
      onToggle={onToggle}
      loadingRows={loadingRows}
      remaining={canLoadMore ? remaining : 0}
      onShowMore={loadMore}
      isLoadingMore={isLoadingMore}
      isFiltered={Boolean(surfaceFilter)}
      selectedIds={selectedIds}
      {...handlers}
    />
  );
};
