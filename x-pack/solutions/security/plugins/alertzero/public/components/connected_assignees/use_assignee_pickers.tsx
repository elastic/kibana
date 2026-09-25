/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { AssignToUsers } from '@kbn/agentic-investigations-common';
import { useUserProfiles, useSuggestUserProfiles } from '@kbn/agentic-investigations-plugin/public';
import { assigneeSignal } from './assignee_overrides';
import { useAssigneeSignal } from './use_assignee_signal';
import { indexProfiles, toSelectedProfiles } from './to_selected_profiles';

export interface UseAssigneePickersOptions<T> {
  /** All items currently displayed; used for bulk profile fetch and to gate signal-driven refreshes. */
  items: T[];
  /** Stable key for the pending map — proposal id, escalation id, etc. */
  getRowKey: (item: T) => string;
  /**
   * Id passed to the mutation and the signal bump. May differ from `getRowKey`
   * (proposals use conversationId; escalations and flyouts use the same id for both).
   */
  getTargetId: (item: T) => string | undefined;
  /** Current assignee uids from server data. */
  getAssigneeUids: (item: T) => readonly string[];
  /** The assignment mutation, called with `(targetId, assigneeUids)`. */
  assign: (targetId: string, assignees: string[]) => Promise<unknown>;
  /**
   * Called after a successful mutation (once) and when the signal fires for a visible
   * target not bumped by this hook. Queue pages pass `invalidateQueries`; the flyout
   * passes `refetchConversation`.
   */
  refresh: () => Promise<unknown>;
  /** Capability flag; also gates the suggestion query. */
  canManage: boolean;
  /** When true, renders the picker read-only regardless of `canManage`. Closed escalations. */
  isReadOnly?: (item: T) => boolean;
  labels: { assignSuccess: string; assignError: string };
}

/**
 * Core assignee-picker logic shared by queue pages (via `useQueueAssignees`) and the
 * flyout header (`ConnectedAssignees`).
 *
 * Handles the full lifecycle: optimistic pending state, bulk profile resolution,
 * suggestion search, the mutation, cross-boundary sync via `assigneeSignal`, and
 * pending-state cleanup. Returns a `renderPicker(item)` render prop.
 *
 * Signal handling:
 * - Self-bumps (bumps this hook sent during `handleChange`) are suppressed so `refresh`
 *   is not called twice — once from `handleChange`, once from the signal handler.
 *   This fixes the latent double-refetch in the flyout.
 * - External bumps only trigger `refresh` when the changed id is a currently visible
 *   target id, avoiding unnecessary requests for unrelated items.
 */
export function useAssigneePickers<T>({
  items,
  getRowKey,
  getTargetId,
  getAssigneeUids,
  assign,
  refresh,
  canManage,
  isReadOnly,
  labels,
}: UseAssigneePickersOptions<T>): (item: T) => React.ReactNode {
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
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Target ids bumped by this hook's own handleChange. The signal handler ignores these
  // ids and removes them, ensuring `refresh` is called exactly once per mutation.
  const selfBumpedRef = useRef<Set<string>>(new Set());

  // Build the set of visible target ids so the signal handler can filter irrelevant bumps.
  // Stored in a ref so the signal callback always reads the current items without being
  // declared as a dependency (its identity changes on every render).
  const visibleTargetIdsRef = useRef<Set<string>>(new Set());
  visibleTargetIdsRef.current = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      const id = getTargetIdRef.current(item);
      if (id) ids.add(id);
    }
    return ids;
  }, [items]);

  // When another hook (a queue row or the flyout) bumps the signal, refresh only if at
  // least one changed id is currently visible and was not sent by this hook itself.
  useAssigneeSignal((changedIds) => {
    const externalIds = changedIds.filter((id) => {
      if (selfBumpedRef.current.has(id)) {
        selfBumpedRef.current.delete(id);
        return false;
      }
      return true;
    });
    const visibleExternal = externalIds.filter((id) => visibleTargetIdsRef.current.has(id));
    if (visibleExternal.length > 0) {
      void refreshRef.current();
    }
  });

  // Collect all assignee uids from the current items for a single bulk profile fetch.
  const allAssigneeUids = useMemo(() => {
    const uids = new Set<string>();
    for (const item of items) {
      for (const uid of getAssigneeUidsRef.current(item)) uids.add(uid);
    }
    return Array.from(uids);
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
        // Mark as self-bumped before bumping so the signal handler skips it.
        // This prevents the double-refresh that would otherwise occur in the flyout
        // (once from this await below, once from the signal handler).
        selfBumpedRef.current.add(targetId);
        assigneeSignal.bump(targetId);
        // Await the refresh so pending state is cleared only after fresh data lands.
        await refreshRef.current();
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
    [notifications]
  );

  return useCallback(
    (item: T): React.ReactNode => {
      const rowKey = getRowKeyRef.current(item);
      const targetId = getTargetIdRef.current(item);
      const isUpdating = pendingAssignees.has(rowKey);
      const readOnly = isReadOnlyRef.current?.(item) ?? false;

      const selected: UserProfileWithAvatar[] = isUpdating
        ? pendingAssignees.get(rowKey) ?? []
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
          canManage={canManage && !readOnly && targetId !== undefined}
          onSearchChange={setSearchTerm}
          onChange={
            targetId ? (newSelected) => void handleChange(rowKey, targetId, newSelected) : () => {}
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
