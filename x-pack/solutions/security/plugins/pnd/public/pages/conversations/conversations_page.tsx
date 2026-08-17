/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useEuiTheme,
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

const QUEUE_STATUSES = new Set(['open', 'investigating', 'in-progress', 'escalated']);
const AUTO_RESOLVED_STATUSES = new Set(['auto-resolved', 'closed']);

const isQueueRow = (investigation: Investigation): boolean =>
  QUEUE_STATUSES.has(investigation.status ?? 'open');

const isAutoResolved = (investigation: Investigation): boolean =>
  AUTO_RESOLVED_STATUSES.has(investigation.status ?? '');

export const ConversationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
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

  const autoResolvedCount = useMemo(
    () => conversations.filter(isAutoResolved).length,
    [conversations]
  );

  const surfaces = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const investigation of sortedConversations) {
      const surface = investigation.affectedSurface?.trim();
      if (surface && !seen.has(surface)) {
        seen.add(surface);
        labels.push(surface);
      }
    }
    return labels;
  }, [sortedConversations]);

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
    <PndPageSection restrictWidth="900px">
      <PndPageHeader
        title={
          <>
            {QUEUE_PAGE_INFO.greetingPrefix}{' '}
            <span
              css={css`
                font-weight: 700;
              `}
            >
              {QUEUE_PAGE_INFO.greetingEmphasis(sortedConversations.length)}
            </span>
          </>
        }
        subtitle={
          autoResolvedCount > 0
            ? QUEUE_PAGE_INFO.autonomousSubline(autoResolvedCount)
            : QUEUE_PAGE_INFO.clearSubline
        }
      />

      {surfaces.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            gutterSize="s"
            wrap
            responsive={false}
            alignItems="center"
            aria-label={QUEUE_PAGE_INFO.affectedSurfaces}
          >
            {surfaces.map((surface) => (
              <EuiFlexItem key={surface} grow={false}>
                <EuiBadge
                  style={{
                    padding: euiTheme.size.s,
                  }}
                  color={surfaceFilter === surface ? 'primary' : 'hollow'}
                  onClick={() =>
                    setSurfaceFilter((current) => (current === surface ? null : surface))
                  }
                  onClickAriaLabel={surface}
                >
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    direction="row"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">{surface}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="danger">
                        {
                          conversations.filter(
                            (conversation) => conversation.affectedSurface === surface
                          ).length
                        }
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ) : null}

      <EuiSpacer size="l" />

      {isLoading ? (
        <EuiFlexGroup justifyContent="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" aria-label={QUEUE_PAGE_INFO.loading} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {error ? (
        <EuiEmptyPrompt iconType="warning" title={<h2>{QUEUE_PAGE_INFO.loadError}</h2>} />
      ) : null}

      {!isLoading && !error && filteredQueueItems.length === 0 ? (
        <EuiEmptyPrompt iconType="chartTagCloud" title={<h2>{QUEUE_PAGE_INFO.emptyQueue}</h2>} />
      ) : null}

      {!isLoading && !error
        ? groupedBriefingItems.map((group) => (
            <ConversationQueue
              briefingId={group.id}
              briefingType={group.id as RecommendedAction}
              briefingList={group.items}
            />
          ))
        : null}
    </PndPageSection>
  );
};
