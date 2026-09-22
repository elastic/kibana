/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import {
  EscalationAssignees,
  EscalationQueue,
  type EscalationQueueItem,
} from '@kbn/agentic-investigations-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  useListEscalations,
  useUpdateEscalation,
  useEscalationUserProfiles,
  useSuggestEscalationAssignees,
} from '@kbn/agentic-investigations-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { ESCALATION_ASSIGNEES_FIELD } from '@kbn/agentic-investigations-plugin/common';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { EscalationsPageHeader } from '../../components/escalations_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { escalationToQueueItem } from './escalation_to_queue_item';
import { ESCALATIONS_PAGE_INFO } from './translations';

export const EscalationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { notifications, application },
  } = useKibana<CoreStart>();

  useAlertZeroDocTitle(ESCALATIONS_PAGE_INFO.pageTitle);

  // Capability check: only render the assignee picker when the user can manage escalations.
  const canManage = application.capabilities.agenticInvestigations?.manageEscalations === true;

  // Per-bucket page state (0-based). Each bucket paginates independently.
  const [openPage, setOpenPage] = useState(0);
  const [closedPage, setClosedPage] = useState(0);

  const openQuery = useListEscalations({ status: 'open', page: openPage + 1 });
  const closedQuery = useListEscalations({ status: 'closed', page: closedPage + 1 });

  const isLoading = openQuery.isLoading || closedQuery.isLoading;
  const hasAnyData = openQuery.data ?? closedQuery.data;
  // Page-level error only when *both* queries failed with no cached data.
  // Per-bucket errors are passed into each EscalationQueue.
  const bothFailed = openQuery.error && closedQuery.error;
  const pageError = bothFailed && !hasAnyData ? (openQuery.error as Error) : null;

  const openItems = useMemo(
    () => (openQuery.data?.results ?? []).map(escalationToQueueItem),
    [openQuery.data]
  );
  const closedItems = useMemo(
    () => (closedQuery.data?.results ?? []).map(escalationToQueueItem),
    [closedQuery.data]
  );

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

  const profilesQuery = useEscalationUserProfiles({ uids: allAssigneeUids });
  const profilesByUid = useMemo(() => {
    const map = new Map<string, UserProfileWithAvatar>();
    for (const profile of profilesQuery.data ?? []) {
      map.set(profile.uid, profile);
    }
    return map;
  }, [profilesQuery.data]);

  // Per-popover search term. One popover is open at a time, so a single term suffices.
  const [searchTerm, setSearchTerm] = useState('');
  const suggestQuery = useSuggestEscalationAssignees(searchTerm);

  const updateEscalation = useUpdateEscalation();

  const handleAssigneesChange = useCallback(
    (escalationId: string, selected: UserProfileWithAvatar[]) => {
      updateEscalation.mutate(
        {
          escalationId,
          body: { [ESCALATION_ASSIGNEES_FIELD]: selected.map((p) => p.uid) },
        },
        {
          onSuccess: () => {
            notifications?.toasts.addSuccess(ESCALATIONS_PAGE_INFO.assignSuccess);
          },
          onError: () => {
            notifications?.toasts.addDanger(ESCALATIONS_PAGE_INFO.assignError);
          },
        }
      );
    },
    [updateEscalation, notifications]
  );

  const renderAssignees = useCallback(
    (escalation: EscalationQueueItem) => {
      // Build the `selected` array from resolved profiles, but preserve unresolved UIDs as
      // synthetic placeholder profiles so they round-trip through the replace-in-full payload
      // and can be removed only by explicit deselect (not silently dropped on a profile miss).
      const selected: UserProfileWithAvatar[] = escalation.assigneeUids.map((uid) => {
        const resolved = profilesByUid.get(uid);
        if (resolved) return resolved;
        // Synthesise a minimal profile for an unresolvable UID (e.g. deleted user).
        // Rendering falls back to an avatar with initials from the uid.
        return {
          uid,
          enabled: true,
          user: { username: uid },
          data: {},
        } as UserProfileWithAvatar;
      });

      return (
        <EscalationAssignees
          escalationId={escalation.id}
          selected={selected}
          suggestions={suggestQuery.data ?? []}
          isSuggestionsLoading={suggestQuery.isLoading}
          // Disable the picker while the bulk profile fetch is still in flight to prevent
          // a change that would silently drop unresolved UIDs from the replace-in-full list.
          isProfilesLoading={profilesQuery.isLoading}
          canManage={canManage}
          onSearchChange={setSearchTerm}
          onChange={(newSelected) => handleAssigneesChange(escalation.id, newSelected)}
        />
      );
    },
    [
      profilesByUid,
      profilesQuery.isLoading,
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
                pageIndex={openPage}
                pageSize={50}
                onPageChange={setOpenPage}
                error={openQuery.error as Error | null}
                renderAssignees={renderAssignees}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EscalationQueue
                status="closed"
                escalations={closedItems}
                totalItemCount={closedQuery.data?.pagination.total}
                pageIndex={closedPage}
                pageSize={50}
                onPageChange={setClosedPage}
                error={closedQuery.error as Error | null}
                renderAssignees={renderAssignees}
              />
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
