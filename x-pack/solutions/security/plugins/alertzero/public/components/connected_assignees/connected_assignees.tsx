/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
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
import { useAssigneeSignal } from './use_assignee_signal';
import { indexProfiles, toSelectedProfiles } from './to_selected_profiles';

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

  // Stable ref so the signal callback always reads the latest refetchConversation without
  // needing it as a dependency (its identity changes every render from the Agent Builder).
  const refetchConversationRef = useRef(refetchConversation);
  refetchConversationRef.current = refetchConversation;

  // When a queue row bumps the signal for this conversation, the flyout refetches so its
  // header reflects the new assignees without waiting for the 5 s poll.
  useAssigneeSignal((changedIds) => {
    if (changedIds.includes(conversationId)) refetchConversationRef.current?.();
  });

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

  // Optimistic state: submitted but not yet server-confirmed selection.
  const [pendingAssignees, setPendingAssignees] = useState<UserProfileWithAvatar[] | null>(null);

  const profilesByUid = useMemo(() => indexProfiles(profilesQuery.data), [profilesQuery.data]);

  const resolvedSelected = useMemo(
    () => toSelectedProfiles(assigneeUids as string[], profilesByUid),
    [assigneeUids, profilesByUid]
  );

  const selected = pendingAssignees ?? resolvedSelected;

  const handleChange = useCallback(
    (newSelected: UserProfileWithAvatar[]) => {
      setPendingAssignees(newSelected);

      const assignees = newSelected.map((p) => p.uid);

      const onSuccess = async () => {
        notifications?.toasts.addSuccess(CONNECTED_ASSIGNEES_LABELS.assignSuccess);
        // Bump the signal so queue rows (in the page's React root) invalidate their cache
        // and reflect the new assignees without waiting for their next poll.
        assigneeSignal.bump(conversationId);
        // Await the flyout's own refetch so pending state is cleared only after fresh
        // assigneeUids arrive from the server, avoiding a flash of the old avatars.
        await refetchConversation?.();
        setPendingAssignees(null);
      };

      const onError = () => {
        notifications?.toasts.addDanger(CONNECTED_ASSIGNEES_LABELS.assignError);
        setPendingAssignees(null);
      };

      if (templateId === 'escalation') {
        assignEscalation.mutate({ escalationId: conversationId, assignees }, { onSuccess, onError });
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
