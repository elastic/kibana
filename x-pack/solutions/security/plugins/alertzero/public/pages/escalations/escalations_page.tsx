/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { css } from '@emotion/react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import {
  AssignToUsers,
  EscalationQueue,
  type EscalationQueueItem,
} from '@kbn/agentic-investigations-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  useAssignEscalation,
  useListEscalations,
  useUserProfiles,
  useSuggestUserProfiles,
  escalationQueryKeys,
} from '@kbn/agentic-investigations-plugin/public';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { EscalationsPageHeader } from '../../components/escalations_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useConversationsUrlParams } from '../conversations/conversations_url_params';
import { useInvestigationDetails } from '../conversations/use_investigation_details';
import { escalationToQueueItem } from './escalation_to_queue_item';
import { ESCALATIONS_PAGE_INFO } from './translations';
import { assigneeSignal } from '../../components/connected_assignees/assignee_overrides';

export const EscalationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { notifications, application },
  } = useKibana<CoreStart>();

  useAlertZeroDocTitle(ESCALATIONS_PAGE_INFO.pageTitle);

  // Capability check: only render the assignee picker when the user can manage escalations.
  const canManage = application.capabilities.agenticInvestigations?.manageEscalations === true;

  // ---------------------------------------------------------------------------
  // Flyout — reuse the conversation URL params / details hook, which is
  // template-agnostic (it just calls agentBuilder.openConversationDetails).
  // ---------------------------------------------------------------------------
  const queryClient = useQueryClient();

  // Subscribe to the cross-boundary signal. Any bump (from ConnectedAssignees on the
  // other side of the React root boundary) triggers a React Query invalidation below,
  // which causes this page to refetch and re-render with the latest assignee data.
  const signalSnapshot = useSyncExternalStore(assigneeSignal.subscribe, assigneeSignal.getSnapshot);

  // Skip invalidation on mount — fire only when the signal actually bumps.
  const isFirstSignalRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstSignalRenderRef.current) {
      isFirstSignalRenderRef.current = false;
      return;
    }
    void queryClient.invalidateQueries({ queryKey: escalationQueryKeys.all });
    // queryClient identity is stable; signalSnapshot reference changes only on bump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalSnapshot]);

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

  // Accumulated items: each "Show more" appends the next page to the list.
  // The response's `pagination.page` is used to detect a reset (page 1) vs. an append.
  const [openItems, setOpenItems] = useState<EscalationQueueItem[]>([]);
  const [closedItems, setClosedItems] = useState<EscalationQueueItem[]>([]);

  useEffect(() => {
    if (!openQuery.data) return;
    const newItems = openQuery.data.results.map(escalationToQueueItem);
    setOpenItems((prev) =>
      openQuery.data!.pagination.page === 1 ? newItems : [...prev, ...newItems]
    );
    // When fresh data arrives, clear any pending optimistic entries for escalations
    // included in this page. This removes the pending state only after the server has
    // confirmed the change, eliminating the flash that would occur if we cleared
    // optimistically in onSettled (before the refetch completed).
    setPendingAssignees((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      let changed = false;
      for (const item of newItems) {
        if (next.delete(item.id)) changed = true;
      }
      return changed ? next : prev;
    });
    // openQuery.data is the only dep: fires when React Query delivers a new page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openQuery.data]);

  useEffect(() => {
    if (!closedQuery.data) return;
    const newItems = closedQuery.data.results.map(escalationToQueueItem);
    setClosedItems((prev) =>
      closedQuery.data!.pagination.page === 1 ? newItems : [...prev, ...newItems]
    );
    setPendingAssignees((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      let changed = false;
      for (const item of newItems) {
        if (next.delete(item.id)) changed = true;
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedQuery.data]);

  const isLoading = openQuery.isLoading || closedQuery.isLoading;
  const hasAnyData = openQuery.data ?? closedQuery.data;
  // Page-level error only when *both* queries failed with no cached data.
  // Per-bucket errors are passed into each EscalationQueue.
  const bothFailed = openQuery.error && closedQuery.error;
  const pageError = bothFailed && !hasAnyData ? (openQuery.error as Error) : null;

  // Collect all assignee uids across both groups for a single bulk profile fetch.
  const allAssigneeUids = useMemo(() => {
    const uids = new Set<string>();
    for (const item of [...openItems, ...closedItems]) {
      for (const uid of item.assigneeUids) {
        uids.add(uid);
      }
    }
    return Array.from(uids);
  }, [openItems, closedItems]);

  const profilesQuery = useUserProfiles({ uids: allAssigneeUids });
  const profilesByUid = useMemo(() => {
    const map = new Map<string, UserProfileWithAvatar>();
    for (const profile of profilesQuery.data ?? []) {
      map.set(profile.uid, profile);
    }
    return map;
  }, [profilesQuery.data]);

  // Per-popover search term. One popover is open at a time, so a single term suffices.
  const [searchTerm, setSearchTerm] = useState('');
  const suggestQuery = useSuggestUserProfiles(searchTerm, { size: 20, enabled: canManage });

  const assignEscalation = useAssignEscalation();

  // Optimistic assignee state: maps escalationId → the selected profiles that were submitted
  // but not yet confirmed by the server. The avatar stack renders from this while in-flight.
  // Cleared by the list-query useEffect once refetched data arrives (success path), or
  // immediately in onError (no refetch happens on failure).
  const [pendingAssignees, setPendingAssignees] = useState<Map<string, UserProfileWithAvatar[]>>(
    new Map()
  );

  const handleAssigneesChange = useCallback(
    (escalationId: string, selected: UserProfileWithAvatar[]) => {
      // Show the new selection immediately before the server responds.
      setPendingAssignees((prev) => new Map(prev).set(escalationId, selected));

      const assignees = selected.map((p) => p.uid);
      assignEscalation.mutate(
        { escalationId, assignees },
        {
          onSuccess: () => {
            notifications?.toasts.addSuccess(ESCALATIONS_PAGE_INFO.assignSuccess);
            // Signal the flyout (ConnectedAssignees) across the React root boundary so it
            // refetches its conversation immediately — without waiting for its 5 s poll.
            assigneeSignal.bump(escalationId);
            // Pending state is cleared by the useEffect when the refetched data arrives.
          },
          onError: () => {
            notifications?.toasts.addDanger(ESCALATIONS_PAGE_INFO.assignError);
            // On error the query won't refetch, so roll back the optimistic state now.
            setPendingAssignees((prev) => {
              const next = new Map(prev);
              next.delete(escalationId);
              return next;
            });
          },
        }
      );
    },
    [assignEscalation, notifications]
  );

  const renderAssignees = useCallback(
    (escalation: EscalationQueueItem) => {
      const isUpdating = pendingAssignees.has(escalation.id);

      // Prefer local pending state (optimistic) over server data while mutation is in flight.
      const baseUids = escalation.assigneeUids;

      // While an update is in flight use the optimistically submitted profiles directly
      // (they carry full avatar data from the picker). Otherwise build the list from
      // resolved profiles, preserving unresolved UIDs as synthetic placeholders so they
      // round-trip through the replace-in-full payload and can only be removed explicitly.
      const selected: UserProfileWithAvatar[] = isUpdating
        ? pendingAssignees.get(escalation.id) ?? []
        : baseUids.map((uid) => {
            const resolved = profilesByUid.get(uid);
            if (resolved) return resolved;
            // Synthesise a minimal profile for an unresolvable UID (e.g. deleted user).
            return {
              uid,
              enabled: true,
              user: { username: uid },
              data: {},
            } as UserProfileWithAvatar;
          });

      return (
        <AssignToUsers
          conversationId={escalation.id}
          selected={selected}
          suggestions={suggestQuery.data ?? []}
          isSuggestionsLoading={suggestQuery.isLoading}
          // Disable the picker while the bulk profile fetch is still in flight to prevent
          // a change that would silently drop unresolved UIDs from the replace-in-full list.
          // `isFetching` (not `isLoading`) is used here: React Query v4 sets `isLoading: true`
          // even for disabled queries that have no data (e.g. when there are no assignee UIDs),
          // which would permanently grey out the button for unassigned escalations.
          isProfilesLoading={profilesQuery.isFetching}
          isUpdating={isUpdating}
          canManage={canManage && escalation.status !== 'closed'}
          onSearchChange={setSearchTerm}
          onChange={(newSelected) => handleAssigneesChange(escalation.id, newSelected)}
        />
      );
    },
    [
      pendingAssignees,
      profilesByUid,
      profilesQuery.isFetching,
      suggestQuery.data,
      suggestQuery.isLoading,
      canManage,
      handleAssigneesChange,
    ]
  );

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
              />
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
