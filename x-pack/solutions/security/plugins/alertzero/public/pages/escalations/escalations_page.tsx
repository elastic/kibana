/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { EscalationQueue, type EscalationQueueItem } from '@kbn/agentic-investigations-common';
import {
  useAssignEscalation,
  useListEscalations,
  escalationQueryKeys,
} from '@kbn/agentic-investigations-plugin/public';
import { useQueryClient } from '@kbn/react-query';
import { useAgenticInvestigationsCapabilities } from '../../hooks/use_agentic_investigations_capabilities';

import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { EscalationsPageHeader } from '../../components/escalations_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useConversationsUrlParams } from '../conversations/conversations_url_params';
import { useInvestigationDetails } from '../conversations/use_investigation_details';
import { escalationToQueueItem } from './escalation_to_queue_item';
import { ESCALATIONS_PAGE_INFO } from './translations';
import { useQueueAssignees } from '../../components/connected_assignees/use_queue_assignees';

export const EscalationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  useAlertZeroDocTitle(ESCALATIONS_PAGE_INFO.pageTitle);

  // Capability check: only render the assignee picker when the user can manage escalations.
  const { manageEscalations: canManage } = useAgenticInvestigationsCapabilities();

  // ---------------------------------------------------------------------------
  // Flyout — reuse the conversation URL params / details hook, which is
  // template-agnostic (it just calls agentBuilder.openConversationDetails).
  // ---------------------------------------------------------------------------
  const queryClient = useQueryClient();

  const { selectedConversationId, selectConversation, clearSelectedConversation } =
    useConversationsUrlParams();

  const handleFlyoutClose = useCallback(() => {
    // Invalidate both open/closed pages so the list reflects any changes made in the flyout
    // (e.g. assignees updated via the header picker).
    void queryClient.invalidateQueries({ queryKey: escalationQueryKeys.all });
    clearSelectedConversation();
  }, [queryClient, clearSelectedConversation]);

  useInvestigationDetails({
    conversationId: selectedConversationId,
    onClose: handleFlyoutClose,
  });

  // ---------------------------------------------------------------------------
  // Per-bucket current page (1-based). Incremented by "Show more"; never reset here.
  // ---------------------------------------------------------------------------
  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);

  const openQuery = useListEscalations({ status: 'open', page: openPage });
  const closedQuery = useListEscalations({ status: 'closed', page: closedPage });

  // Items stored by page number so that a refetch of the same page replaces its rows
  // in place rather than appending them (which would duplicate rows after "Show more").
  // Only the active (last) page query is mounted, so earlier pages keep their cached
  // items in this map until the component unmounts.
  const [openPages, setOpenPages] = useState<Record<number, EscalationQueueItem[]>>({});
  const [closedPages, setClosedPages] = useState<Record<number, EscalationQueueItem[]>>({});

  useEffect(() => {
    if (!openQuery.data) return;
    const page = openQuery.data.pagination.page;
    const newItems = openQuery.data.results.map(escalationToQueueItem);
    setOpenPages((prev) => ({ ...prev, [page]: newItems }));
  }, [openQuery.data]);

  useEffect(() => {
    if (!closedQuery.data) return;
    const page = closedQuery.data.pagination.page;
    const newItems = closedQuery.data.results.map(escalationToQueueItem);
    setClosedPages((prev) => ({ ...prev, [page]: newItems }));
  }, [closedQuery.data]);

  // Flatten pages in order, deduping by id (offset shifts can move a row between pages).
  const openItems = useMemo(() => {
    const seen = new Set<string>();
    return Object.keys(openPages)
      .sort((a, b) => Number(a) - Number(b))
      .flatMap((p) => openPages[Number(p)])
      .filter((item) => (seen.has(item.id) ? false : seen.add(item.id)));
  }, [openPages]);

  const closedItems = useMemo(() => {
    const seen = new Set<string>();
    return Object.keys(closedPages)
      .sort((a, b) => Number(a) - Number(b))
      .flatMap((p) => closedPages[Number(p)])
      .filter((item) => (seen.has(item.id) ? false : seen.add(item.id)));
  }, [closedPages]);

  const isLoading = openQuery.isLoading || closedQuery.isLoading;
  const hasAnyData = openQuery.data ?? closedQuery.data;
  // Page-level error only when *both* queries failed with no cached data.
  // Per-bucket errors are passed into each EscalationQueue.
  const bothFailed = openQuery.error && closedQuery.error;
  const pageError = bothFailed && !hasAnyData ? (openQuery.error as Error) : null;

  const assignEscalation = useAssignEscalation();

  const allItems = useMemo(() => [...openItems, ...closedItems], [openItems, closedItems]);

  const renderAssignees = useQueueAssignees({
    items: allItems,
    getRowKey: (e) => e.id,
    getTargetId: (e) => e.id,
    getAssigneeUids: (e) => e.assigneeUids,
    assign: (escalationId, assignees) => assignEscalation.mutateAsync({ escalationId, assignees }),
    queryKey: escalationQueryKeys.all,
    canManage,
    isReadOnly: (e) => e.status === 'closed',
    labels: {
      assignSuccess: ESCALATIONS_PAGE_INFO.assignSuccess,
      assignError: ESCALATIONS_PAGE_INFO.assignError,
    },
  });

  return (
    <AlertZeroPageSection
      contentProps={{
        css: css`
          padding-block: ${euiTheme.size.xxl};
          align-self: center;
          max-width: 1000px;
        `,
      }}
    >
      <EuiFlexGroup gutterSize="l" direction="column" wrap>
        <EuiFlexItem grow={false}>
          <EscalationsPageHeader
            isLoading={isLoading}
            hasError={Boolean(pageError)}
            openCount={openQuery.data?.pagination.total ?? 0}
          />
        </EuiFlexItem>

        {isLoading ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" style={{ minHeight: 200 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" aria-label={ESCALATIONS_PAGE_INFO.loading} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}

        {pageError ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt iconType="warning" title={<h2>{ESCALATIONS_PAGE_INFO.loadError}</h2>} />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !pageError ? (
          <>
            <EuiFlexItem grow={false}>
              <EscalationQueue
                status="open"
                escalations={openItems}
                totalItemCount={openQuery.data?.pagination.total}
                onLoadMore={() => setOpenPage((p) => p + 1)}
                error={openQuery.error as Error | null}
                renderAssignees={renderAssignees}
                onClickCard={selectConversation}
                selectedConversationId={selectedConversationId}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EscalationQueue
                status="closed"
                escalations={closedItems}
                totalItemCount={closedQuery.data?.pagination.total}
                onLoadMore={() => setClosedPage((p) => p + 1)}
                error={closedQuery.error as Error | null}
                renderAssignees={renderAssignees}
                onClickCard={selectConversation}
                selectedConversationId={selectedConversationId}
              />
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
