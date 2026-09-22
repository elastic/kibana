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
    services: { notifications },
  } = useKibana<CoreStart>();

  useAlertZeroDocTitle(ESCALATIONS_PAGE_INFO.pageTitle);

  const openQuery = useListEscalations({ status: 'open' });
  const closedQuery = useListEscalations({ status: 'closed' });

  const isLoading = openQuery.isLoading || closedQuery.isLoading;
  const hasAnyData = openQuery.data ?? closedQuery.data;
  const anyError = openQuery.error ?? closedQuery.error;
  const error = anyError && !hasAnyData ? anyError : null;

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
      const selected = escalation.assigneeUids
        .map((uid) => profilesByUid.get(uid))
        .filter((p): p is UserProfileWithAvatar => p !== undefined);

      return (
        <EscalationAssignees
          escalationId={escalation.id}
          selected={selected}
          suggestions={suggestQuery.data ?? []}
          isSuggestionsLoading={suggestQuery.isLoading}
          onSearchChange={setSearchTerm}
          onChange={(newSelected) => handleAssigneesChange(escalation.id, newSelected)}
        />
      );
    },
    [profilesByUid, suggestQuery.data, suggestQuery.isLoading, handleAssigneesChange]
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
            hasError={Boolean(error)}
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

        {error ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt iconType="warning" title={<h2>{ESCALATIONS_PAGE_INFO.loadError}</h2>} />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !error ? (
          <>
            <EuiFlexItem grow={false}>
              <EscalationQueue
                status="open"
                escalations={openItems}
                renderAssignees={renderAssignees}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EscalationQueue
                status="closed"
                escalations={closedItems}
                renderAssignees={renderAssignees}
              />
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
