/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import {
  CONVERSATION_QUEUE_CATEGORIES,
  type Investigation,
  type RecommendedAction,
} from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useInvestigations } from '../../hooks/use_investigations_api';
import { QUEUE_PAGE_INFO } from './translations';
import { ConversationQueue } from '../../components/conversation_queue';
import { BlastRadius } from '../../components/blast_radius';

const QUEUE_STATUSES = new Set(['open', 'investigating', 'in-progress', 'escalated']);

const isQueueRow = (investigation: Investigation): boolean =>
  QUEUE_STATUSES.has(investigation.status ?? 'open');

export const ConversationsPage: React.FC = () => {
  const { data, isLoading, error } = useInvestigations();
  const [surfaceFilter, setSurfaceFilter] = useState<string | null>(null);
  usePndDocTitle(QUEUE_PAGE_INFO.pageTitle);

  // TODO: update data fetching to use the new conversations API (useConversations) and remove the useInvestigations hook
  const conversations = useMemo(() => data?.investigations ?? [], [data?.investigations]);

  const sortedConversations = useMemo(
    () =>
      conversations.filter(isQueueRow).sort((a, b) => {
        const priorityDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      }),
    [conversations]
  );

  const filteredQueueItems = useMemo(
    () =>
      sortedConversations.filter((conversation) => {
        if (surfaceFilter && conversation.affectedSurface !== surfaceFilter) return false;
        return true;
      }),
    [sortedConversations, surfaceFilter]
  );

  const groupedBriefingItems = useMemo(() => {
    const groups: Array<{
      id: RecommendedAction;
      label: string;
      items: Investigation[];
    }> = [];
    for (const bucket of CONVERSATION_QUEUE_CATEGORIES) {
      const items = filteredQueueItems.filter(
        (conversation) => conversation.recommendedAction === bucket.id
      );
      if (items.length >= 0) {
        groups.push({ ...bucket, items });
      }
    }
    return groups;
  }, [filteredQueueItems]);

  return (
    <PndPageSection
      restrictWidth
      css={css`
        align-self: center;
        @media (min-width: 1920px) {
          max-width: 1300px;
        }
        max-width: 960px;
      `}
    >
      <EuiFlexGroup gutterSize="l" direction="column" wrap>
        <EuiFlexItem grow={false}>
          <PndPageHeader
            isQueueEmpty={sortedConversations.length === 0}
            eventCount={filteredQueueItems.length}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <BlastRadius
            investigations={sortedConversations}
            surfaceFilter={surfaceFilter}
            onSurfaceFilterChange={setSurfaceFilter}
          />
        </EuiFlexItem>

        {isLoading ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" style={{ minHeight: 200 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" aria-label={QUEUE_PAGE_INFO.loading} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}

        {error ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt iconType="warning" title={<h2>{QUEUE_PAGE_INFO.loadError}</h2>} />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !error && filteredQueueItems.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt
              iconType="chartTagCloud"
              title={<h2>{QUEUE_PAGE_INFO.emptyQueue}</h2>}
            />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !error
          ? groupedBriefingItems.map((group) => (
              <EuiFlexItem key={group.id} grow={false}>
                <ConversationQueue
                  briefingId={group.id}
                  briefingType={group.id as RecommendedAction}
                  briefingList={group.items}
                  isFiltered={filteredQueueItems.length !== sortedConversations.length}
                />
              </EuiFlexItem>
            ))
          : null}
      </EuiFlexGroup>
    </PndPageSection>
  );
};
