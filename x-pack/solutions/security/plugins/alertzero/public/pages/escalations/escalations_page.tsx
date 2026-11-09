/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import {
  EscalationQueue,
  Impact,
  useEntityFilter,
  type EscalationQueueItem,
} from '@kbn/agentic-investigations-common';
import {
  useAssignEscalation,
  useEscalationImpactPills,
  useListEscalations,
  escalationQueryKeys,
  impactPillsQueryKeys,
  useOpenInChat,
} from '@kbn/agentic-investigations-plugin/public';

import { AgentBuilderPrivilegeCallout } from '../../components/agent_builder_privilege_callout/agent_builder_privilege_callout';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { EscalationsPageHeader } from '../../components/escalations_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useQueuePolling } from '../../hooks/use_queue_polling';
import { useAlertZeroInvestigationsCapabilities } from '../../hooks/use_alertzero_investigations_capabilities';
import { escalationToQueueItem } from './escalation_to_queue_item';
import { ESCALATIONS_PAGE_INFO } from './translations';
import { EscalationsOpenNote } from './escalations_open_note';
import { EscalationsEmptyBanner } from './escalations_empty_banner';
import { useQueueAssignees } from '../../components/connected_assignees/use_queue_assignees';

const POLLED_QUERY_KEYS = [escalationQueryKeys.lists()];
const POLLED_ALL_PAGES_QUERY_KEYS = [impactPillsQueryKeys.escalations()];

export const EscalationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  useAlertZeroDocTitle(ESCALATIONS_PAGE_INFO.pageTitle);
  useQueuePolling(POLLED_QUERY_KEYS, POLLED_ALL_PAGES_QUERY_KEYS);

  // Capability check: only render the assignee picker when the user can manage escalations.
  const { manageEscalations: canManage, canAccessAgentBuilder } =
    useAlertZeroInvestigationsCapabilities();

  // Clicking a row navigates to Agent Builder with the conversation details flyout open.
  // getChatHref is also forwarded so cards render as real links (Cmd-click, URL on hover).
  const { getChatHref, openChat } = useOpenInChat();

  const impactPills = useEscalationImpactPills();
  const { entityFilter, selectedPill, setEntityFilter } = useEntityFilter(impactPills);

  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);

  // Items stored by page number so that a refetch of the same page replaces its rows
  // in place rather than appending them (which would duplicate rows after "Show more").
  // Only the active (last) page query is mounted, so earlier pages keep their cached
  // items in this map until the component unmounts.
  const [openPages, setOpenPages] = useState<Record<number, EscalationQueueItem[]>>({});
  const [closedPages, setClosedPages] = useState<Record<number, EscalationQueueItem[]>>({});

  // Reset during render, so no request goes out for the old page number under the new filter
  // and rows of the previous filter never show up next to its pages.
  const [pagedEntity, setPagedEntity] = useState(entityFilter);
  if (pagedEntity !== entityFilter) {
    setPagedEntity(entityFilter);
    setOpenPage(1);
    setClosedPage(1);
    setOpenPages({});
    setClosedPages({});
  }

  const openQuery = useListEscalations({ status: 'open', page: openPage, entity: entityFilter });
  const closedQuery = useListEscalations({
    status: 'closed',
    page: closedPage,
    entity: entityFilter,
  });

  // A filtered list reports only its own total, so the header keeps the last unfiltered one.
  const unfilteredOpenTotal = useRef<number>();
  useEffect(() => {
    if (!entityFilter && openQuery.data && !openQuery.isPreviousData) {
      unfilteredOpenTotal.current = openQuery.data.pagination.total;
    }
  }, [entityFilter, openQuery.data, openQuery.isPreviousData]);

  useEffect(() => {
    if (!openQuery.data || openQuery.isPreviousData) return;
    const page = openQuery.data.pagination.page;
    const newItems = openQuery.data.results.map(escalationToQueueItem);
    // Page 1 starts the list over, so rows of a previous filter are replaced, not kept.
    setOpenPages((prev) => (page === 1 ? { 1: newItems } : { ...prev, [page]: newItems }));
  }, [openQuery.data, openQuery.isPreviousData]);

  useEffect(() => {
    if (!closedQuery.data || closedQuery.isPreviousData) return;
    const page = closedQuery.data.pagination.page;
    const newItems = closedQuery.data.results.map(escalationToQueueItem);
    setClosedPages((prev) => (page === 1 ? { 1: newItems } : { ...prev, [page]: newItems }));
  }, [closedQuery.data, closedQuery.isPreviousData]);

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

  const openIsEmpty = !entityFilter && openQuery.data?.pagination.total === 0;
  // Stable element so the memoized queue is not re-rendered by unrelated page updates.
  const openNote = useMemo(
    () => (openIsEmpty ? <EscalationsOpenNote /> : undefined),
    [openIsEmpty]
  );

  const isLoading = openQuery.isLoading || closedQuery.isLoading;
  const hasAnyData = openQuery.data ?? closedQuery.data;
  // Page-level error only when *both* queries failed with no cached data.
  // Per-bucket errors are passed into each EscalationQueue.
  const bothFailed = openQuery.error && closedQuery.error;
  const pageError = bothFailed && !hasAnyData ? (openQuery.error as Error) : null;

  const assignEscalation = useAssignEscalation();

  const allItems = useMemo(() => [...openItems, ...closedItems], [openItems, closedItems]);

  // Both queues loaded and neither has any rows (a filtered total says nothing about the queue).
  const hasNoEscalations =
    !entityFilter &&
    openQuery.data?.pagination.total === 0 &&
    closedQuery.data?.pagination.total === 0;

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

  // Nothing to show yet: the page is just the explainer banner, centered, with no header or queues.
  if (hasNoEscalations) {
    return (
      <AlertZeroPageSection
        contentProps={{
          css: css`
            padding-block: ${euiTheme.size.xxl};
            align-self: center;
            max-width: 1000px;
            inline-size: 100%;
            flex-grow: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          `,
        }}
      >
        <EscalationsEmptyBanner />
      </AlertZeroPageSection>
    );
  }

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
      {/* No `wrap`: a wrapping column sizes each line to its widest content and lets a
          wide row push the page past the viewport. Same fix as the conversations page. */}
      <EuiFlexGroup gutterSize="l" direction="column">
        <EuiFlexItem grow={false}>
          <EscalationsPageHeader
            isLoading={isLoading}
            hasError={Boolean(pageError)}
            openCount={
              (entityFilter ? unfilteredOpenTotal.current : openQuery.data?.pagination.total) ?? 0
            }
          />
        </EuiFlexItem>

        {!canAccessAgentBuilder && (
          <EuiFlexItem grow={false}>
            <AgentBuilderPrivilegeCallout />
          </EuiFlexItem>
        )}

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
              <Impact
                impact={impactPills}
                selectedPill={selectedPill}
                entityFilter={entityFilter}
                onEntityFilterChange={setEntityFilter}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EscalationQueue
                status="open"
                note={openNote}
                escalations={openItems}
                isFiltered={Boolean(entityFilter)}
                totalItemCount={openQuery.data?.pagination.total}
                onLoadMore={openQuery.isPreviousData ? undefined : () => setOpenPage((p) => p + 1)}
                error={openQuery.error as Error | null}
                renderAssignees={renderAssignees}
                onClickCard={(item) => openChat(item.id, item.agentId)}
                getHref={(item) => getChatHref(item.id, item.agentId)}
                canOpenInvestigationDetails={canAccessAgentBuilder}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EscalationQueue
                status="closed"
                escalations={closedItems}
                isFiltered={Boolean(entityFilter)}
                totalItemCount={closedQuery.data?.pagination.total}
                onLoadMore={
                  closedQuery.isPreviousData ? undefined : () => setClosedPage((p) => p + 1)
                }
                error={closedQuery.error as Error | null}
                renderAssignees={renderAssignees}
                onClickCard={(item) => openChat(item.id, item.agentId)}
                getHref={(item) => getChatHref(item.id, item.agentId)}
                canOpenInvestigationDetails={canAccessAgentBuilder}
              />
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
