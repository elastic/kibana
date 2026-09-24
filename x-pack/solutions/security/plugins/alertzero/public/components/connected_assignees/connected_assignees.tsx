/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AssignToUsers } from '@kbn/agentic-investigations-common';
import type { AssigneesSlotRenderProps } from '@kbn/agentic-investigations-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  useAssignEscalation,
  useAssignInvestigation,
  useUserProfiles,
  useSuggestUserProfiles,
} from '@kbn/agentic-investigations-plugin/public';
import {
  AGENTIC_INVESTIGATIONS_PLUGIN_ID,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  INVESTIGATIONS_UI_CAPABILITY_MANAGE,
} from '@kbn/agentic-investigations-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { CONNECTED_ASSIGNEES_LABELS } from './translations';
import { assigneeSignal } from './assignee_overrides';

/**
 * Connected assignee picker for the investigation and escalation flyout headers.
 *
 * This component lives in alertzero's plugin (not the shared package) so it can use
 * `useKibana`, HTTP mutation hooks, and capability checks — none of which are available
 * inside the Agent Builder flyout's isolated React root.
 *
 * At registration time the plugin wraps this in `KibanaContextProvider` +
 * `QueryClientProvider`, so all hooks below have the context they need.
 */
const ConnectedAssigneesInner = ({
  conversationId,
  templateId,
  assigneeUids,
  status,
  refetchConversation,
}: AssigneesSlotRenderProps) => {
  const {
    services: { notifications, application },
  } = useKibana<CoreStart>();

  // Capability check differs by template.
  const canManageEscalations =
    application.capabilities[AGENTIC_INVESTIGATIONS_PLUGIN_ID]?.[
      ESCALATIONS_UI_CAPABILITY_MANAGE
    ] === true;
  const canManageInvestigations =
    application.capabilities[AGENTIC_INVESTIGATIONS_PLUGIN_ID]?.[
      INVESTIGATIONS_UI_CAPABILITY_MANAGE
    ] === true;

  const canManage =
    templateId === 'escalation'
      ? canManageEscalations && status !== 'closed'
      : canManageInvestigations;

  // Subscribe to the cross-boundary signal so the flyout re-fetches its conversation
  // when a queue row updates assignees for this conversation from the other side.
  const signalSnapshot = useSyncExternalStore(assigneeSignal.subscribe, assigneeSignal.getSnapshot);
  const currentVersion = signalSnapshot.get(conversationId) ?? 0;

  // Stable ref so the effect closure always calls the latest refetchConversation without
  // being listed as an effect dependency (its identity changes every render).
  const refetchConversationRef = useRef(refetchConversation);
  refetchConversationRef.current = refetchConversation;

  // Track the version we've already handled so we fire only on genuine bumps.
  const prevVersionRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevVersionRef.current === null) {
      prevVersionRef.current = currentVersion;
      return;
    }
    if (currentVersion !== prevVersionRef.current) {
      prevVersionRef.current = currentVersion;
      refetchConversationRef.current?.();
    }
    // conversationId reset → reset the baseline so a stale version from a previous
    // conversation doesn't immediately trigger a refetch for the new one.
  }, [currentVersion, conversationId]);

  // Bulk-resolve the current assignee uids into full profile objects.
  const profilesQuery = useUserProfiles({
    uids: assigneeUids as string[],
    enabled: (assigneeUids?.length ?? 0) > 0,
  });

  // Suggestion search for the popover.
  const [searchTerm, setSearchTerm] = useState('');
  const suggestQuery = useSuggestUserProfiles(searchTerm, { size: 20, enabled: canManage });

  // Mutations — pick the right endpoint by template id.
  const assignInvestigation = useAssignInvestigation();
  const assignEscalation = useAssignEscalation();

  // Optimistic state: maps → submitted but not yet server-confirmed selection.
  const [pendingAssignees, setPendingAssignees] = useState<UserProfileWithAvatar[] | null>(null);

  const profilesByUid = useMemo(() => {
    const map = new Map<string, UserProfileWithAvatar>();
    for (const profile of profilesQuery.data ?? []) {
      map.set(profile.uid, profile);
    }
    return map;
  }, [profilesQuery.data]);

  /** Build the displayed selection from resolved profiles + synthetic placeholders for unknowns. */
  const resolvedSelected = useMemo<UserProfileWithAvatar[]>(
    () =>
      (assigneeUids as string[]).map((uid) => {
        const resolved = profilesByUid.get(uid);
        if (resolved) return resolved;
        // Synthesise a minimal profile so unresolvable uids survive the replace-in-full payload.
        return {
          uid,
          enabled: true,
          user: { username: uid },
          data: {},
        } as UserProfileWithAvatar;
      }),
    [assigneeUids, profilesByUid]
  );

  const selected = pendingAssignees ?? resolvedSelected;

  const handleChange = useCallback(
    (newSelected: UserProfileWithAvatar[]) => {
      // Show the new selection immediately.
      setPendingAssignees(newSelected);

      const assignees = newSelected.map((p) => p.uid);

      const onSuccess = async () => {
        notifications?.toasts.addSuccess(CONNECTED_ASSIGNEES_LABELS.assignSuccess);
        // Signal queue rows (on the other side of the React root boundary) to invalidate
        // their React Query cache and refetch. The same bump also causes this component's
        // useEffect to call refetchConversation, so we don't call it explicitly here.
        assigneeSignal.bump(conversationId);
        // Optimistic state stays visible until the refetch (triggered by the useEffect)
        // delivers fresh assigneeUids from the server.
        await refetchConversation?.();
        setPendingAssignees(null);
      };

      const onError = () => {
        notifications?.toasts.addDanger(CONNECTED_ASSIGNEES_LABELS.assignError);
        setPendingAssignees(null);
      };

      if (templateId === 'escalation') {
        assignEscalation.mutate(
          { escalationId: conversationId, assignees },
          { onSuccess, onError }
        );
      } else {
        assignInvestigation.mutate(
          { investigationId: conversationId, assignees },
          { onSuccess, onError }
        );
      }
    },
    [
      conversationId,
      templateId,
      assignEscalation,
      assignInvestigation,
      notifications,
      refetchConversation,
    ]
  );

  const isUpdating = pendingAssignees !== null;

  return (
    <AssignToUsers
      conversationId={conversationId}
      selected={selected}
      suggestions={suggestQuery.data ?? []}
      isSuggestionsLoading={suggestQuery.isLoading}
      isProfilesLoading={profilesQuery.isFetching}
      isUpdating={isUpdating}
      canManage={canManage}
      onSearchChange={setSearchTerm}
      onChange={handleChange}
    />
  );
};

ConnectedAssigneesInner.displayName = 'ConnectedAssignees';

export const ConnectedAssignees = memo(ConnectedAssigneesInner);
