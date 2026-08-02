/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPagination, EuiSpacer, EuiTitle } from '@elastic/eui';

import { ThreadGroupCard, type QueueEvent } from '../../../../components/queue';
import { CHATS_PAGE_PER_PAGE } from '../../helpers/chats_page_size';
import type { ChatGroup } from '../../helpers/nest_chat_groups';

export interface ChatKindGroupProps {
  groups: readonly ChatGroup[];
  label: string;
  onChildApprovalRequest?: (event: QueueEvent) => void;
  onOpenChat: (id: string) => void;
  onOpenParent: (id: string) => void;
  onPageClick: (page: number) => void;
  onSelectChild: (eventId: string) => void;
  page: number;
  paginationAriaLabel: string;
  sectionId: string;
  selectedConversationId?: string;
  total: number;
}

/**
 * One independently paged kind group: incidents or investigations. Nesting is
 * {@link ThreadGroupCard}; paging is at group level, so children are passed
 * already sliced and the card's fold-after-3 is the only child truncation.
 */
export const ChatKindGroup: React.FC<ChatKindGroupProps> = ({
  groups,
  label,
  onChildApprovalRequest,
  onOpenChat,
  onOpenParent,
  onPageClick,
  onSelectChild,
  page,
  paginationAriaLabel,
  sectionId,
  selectedConversationId,
  total,
}) => {
  const pageCount = Math.ceil(total / CHATS_PAGE_PER_PAGE);

  if (total === 0 || groups.length === 0) {
    return null;
  }

  return (
    <section data-test-subj={`pndChatsKindGroup-${sectionId}`}>
      <EuiTitle size="xs">
        <h2>{label}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {groups.map(({ children, parent }) => (
          <EuiFlexItem grow={false} key={parent.id}>
            <ThreadGroupCard
              onChildApprovalRequest={onChildApprovalRequest}
              onOpenChat={onOpenChat}
              onOpenParent={onOpenParent}
              onSelectChild={onSelectChild}
              parent={parent}
              pendingChildren={children}
              selectedChildId={selectedConversationId}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {pageCount > 1 ? (
        <>
          <EuiSpacer size="m" />
          <EuiPagination
            activePage={page - 1}
            aria-label={paginationAriaLabel}
            data-test-subj={`pndChatsKindGroupPagination-${sectionId}`}
            onPageClick={(nextPage) => onPageClick(nextPage + 1)}
            pageCount={pageCount}
          />
        </>
      ) : null}
    </section>
  );
};
