/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { QueryKey } from '@kbn/react-query';
import { useQueryClient } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { AssignToUsers } from '@kbn/agentic-investigations-common';
import {
  useUserProfiles,
  useSuggestUserProfiles,
} from '@kbn/agentic-investigations-plugin/public';
import { assigneeSignal } from './assignee_overrides';
import { useAssigneeSignal } from './use_assignee_signal';
import { indexProfiles, toSelectedProfiles } from './to_selected_profiles';

export interface UseQueueAssigneesOptions<T> {
  /** All items currently displayed; used to collect uids for the bulk profile fetch. */
  items: T[];
  /** Stable key for the pending map — proposal id, escalation id, etc. */
  getRowKey: (item: T) => string;
  /** Id passed to the mutation. May differ from `getRowKey` (proposals use conversationId). */
  getTargetId: (item: T) => string | undefined;
  /** Current assignee uids from server data. */
  getAssigneeUids: (item: T) => readonly string[];
  /** The assignment mutation, called with `(targetId, assigneeUids)`. */
  assign: (targetId: string, assignees: string[]) => Promise<unknown>;
  /** Query key to invalidate (and await) after a successful mutation. */
  queryKey: QueryKey;
  /** Capability flag; also gates the suggestion query. */
  canManage: boolean;
  /** When true, renders the picker read-only regardless of `canManage`. Closed escalations. */
  isReadOnly?: (item: T) => boolean;
  labels: { assignSuccess: string; assignError: string };
}

/**
 * Shared assignee-picker logic for queue pages.
 *
 * Handles the full lifecycle: optimistic pending state, bulk profile resolution,
 * suggestion search, the mutation, cross-boundary flyout sync via `assigneeSignal`,
 * query invalidation (with `cancelRefetch: false` to join any in-flight refetch), and
 * pending-state cleanup. Returns a `renderAssignees(item)` render prop.
 *
 * Mutation-specific details (which endpoint, which query key, which labels) are
 * passed as parameters; everything else is shared.
 */
export function useQueueAssignees<T>({
  items,
  getRowKey,
  getTargetId,
  getAssigneeUids,
  assign,
  queryKey,
  canManage,
  isReadOnly,
  labels,
}: UseQueueAssigneesOptions<T>): (item: T) => React.ReactNode {
  const queryClient = useQueryClient();
  const {
    services: { notifications },
  } = useKibana<CoreStart>();

  // Hold mutable props in refs so inner callbacks stay stable across renders.
  const assignRef = useRef(assign);
  assignRef.current = assign;
  const getRowKeyRef = useRef(getRowKey);
  getRowKeyRef.current = getRowKey;
  const getTargetIdRef = useRef(getTargetId);
  getTargetIdRef.current = getTargetId;
  const getAssigneeUidsRef = useRef(getAssigneeUids);
  getAssigneeUidsRef.current = getAssigneeUids;
  const isReadOnlyRef = useRef(isReadOnly);
  isReadOnlyRef.current = isReadOnly;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  // When the flyout (ConnectedAssignees) bumps the signal after its own successful
  // mutation, invalidate this page's list so queue rows reflect the new assignees.
  // cancelRefetch: false joins any in-flight fetch rather than cancelling it, so an
  // await in an in-progress handleChange resolves against fresh data, not a stale one.
  useAssigneeSignal(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeyRef.current }, { cancelRefetch: false });
  });

  // Collect all assignee uids from the current items for a single bulk profile fetch.
  const allAssigneeUids = useMemo(() => {
    const uids = new Set<string>();
    for (const item of items) {
      for (const uid of getAssigneeUidsRef.current(item)) uids.add(uid);
    }
    return Array.from(uids);
    // getAssigneeUidsRef is stable; items is the true dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const profilesQuery = useUserProfiles({ uids: allAssigneeUids });
  const profilesByUid = useMemo(() => indexProfiles(profilesQuery.data), [profilesQuery.data]);

  const [searchTerm, setSearchTerm] = useState('');
  const suggestQuery = useSuggestUserProfiles(searchTerm, { size: 20, enabled: canManage });

  // Optimistic pending state: rowKey → the submitted-but-not-yet-confirmed selection.
  const [pendingAssignees, setPendingAssignees] = useState<Map<string, UserProfileWithAvatar[]>>(
    new Map()
  );

  const handleChange = useCallback(
    async (rowKey: string, targetId: string, newSelected: UserProfileWithAvatar[]) => {
      setPendingAssignees((prev) => new Map(prev).set(rowKey, newSelected));
      const assignees = newSelected.map((p) => p.uid);
      try {
        await assignRef.current(targetId, assignees);
        notifications?.toasts.addSuccess(labelsRef.current.assignSuccess);
        // Bump the signal so the flyout (ConnectedAssignees), which lives in a separate
        // React root with its own QueryClient, sees the change immediately.
        assigneeSignal.bump(targetId);
        // Await the invalidation so pending state is not cleared before fresh rows land.
        // cancelRefetch: false joins the in-flight fetch the bump may have started via the
        // signal handler above rather than cancelling and restarting it.
        await queryClient.invalidateQueries(
          { queryKey: queryKeyRef.current },
          { cancelRefetch: false }
        );
        setPendingAssignees((prev) => {
          const next = new Map(prev);
          next.delete(rowKey);
          return next;
        });
      } catch {
        notifications?.toasts.addDanger(labelsRef.current.assignError);
        setPendingAssignees((prev) => {
          const next = new Map(prev);
          next.delete(rowKey);
          return next;
        });
      }
    },
    [queryClient, notifications]
  );

  return useCallback(
    (item: T): React.ReactNode => {
      const rowKey = getRowKeyRef.current(item);
      const targetId = getTargetIdRef.current(item);
      const isUpdating = pendingAssignees.has(rowKey);
      const readOnly = isReadOnlyRef.current?.(item) ?? false;

      const selected: UserProfileWithAvatar[] = isUpdating
        ? (pendingAssignees.get(rowKey) ?? [])
        : toSelectedProfiles(getAssigneeUidsRef.current(item), profilesByUid);

      return (
        <AssignToUsers
          conversationId={rowKey}
          selected={selected}
          suggestions={suggestQuery.data ?? []}
          isSuggestionsLoading={suggestQuery.isLoading}
          // `isFetching` (not `isLoading`) avoids permanently disabling the button when
          // there are no assignees (React Query sets isLoading: true for disabled queries).
          isProfilesLoading={profilesQuery.isFetching}
          isUpdating={isUpdating}
          canManage={canManage && !readOnly}
          onSearchChange={setSearchTerm}
          onChange={
            targetId
              ? (newSelected) => void handleChange(rowKey, targetId, newSelected)
              : () => {}
          }
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
      handleChange,
    ]
  );
}
