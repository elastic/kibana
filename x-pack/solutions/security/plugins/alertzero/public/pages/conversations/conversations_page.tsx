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
  ConversationQueue,
  CONVERSATION_QUEUE_CATEGORIES,
  type ConversationsActionsGroupProps,
  type BaseActionsProps,
  type CardActionType,
  type Investigation,
  type RecommendedAction,
  InvestigationDetailsFlyout,
  BlastRadius,
  AssignActionModal,
  ApprovalModal,
} from '@kbn/agentic-investigations-common';
import { useApproveProposal, useDismissProposal } from '@kbn/agentic-investigations-plugin/public';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useProposalsList } from '../../hooks/use_proposals_api';
import { QUEUE_PAGE_INFO } from './translations';
import { ProposalsTrendChartRow } from '../../components/proposals_trend_chart';
import { DismissProposalModal } from '../../components/pending_proposals/dismiss_proposal_modal';
import { CLOSED_GROUP_KEY } from '../../../common/proposals/list';
import type { ProposalItem } from '../../../common/proposals/list';
import { proposalToInvestigation } from './proposal_to_investigation';

const QUEUE_STATUSES = new Set(['open', 'investigating', 'in-progress', 'escalated']);

const isQueueRow = (investigation: Investigation): boolean =>
  QUEUE_STATUSES.has(investigation.status ?? 'open');

export const ConversationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading, error } = useProposalsList();
  const approve = useApproveProposal();
  const dismiss = useDismissProposal();
  const [surfaceFilter, setSurfaceFilter] = useState<string | null>(null);
  useAlertZeroDocTitle(QUEUE_PAGE_INFO.pageTitle);

  const [selectedIdForRecommendedAction, setSelectedIdForRecommendedAction] = useState<
    string | undefined
  >(undefined);

  const [selectedIdForDetails, setSelectedIdForDetails] = useState<string | undefined>(undefined);
  const [modalState, setModalState] = useState<{
    type: CardActionType | null;
    recordId: Investigation['recordId'] | null;
    assignee?: string | null;
  }>({ type: null, recordId: null, assignee: null });

  // Raw proposals indexed by id so that approve can submit the original
  // actionInput without it needing a field on Investigation.
  const proposalsById = useMemo((): Map<string, ProposalItem> => {
    const all: ProposalItem[] = Object.values(data?.groups ?? {}).flat();
    return new Map(all.map((p) => [p.id, p]));
  }, [data?.groups]);

  // Adapt all proposals (including closed) into Investigation shape. The
  // adapter sets recommendedAction: 'closed' for decided ones, which routes
  // them into the Closed accordion via groupedBriefingItems below.
  const conversations = useMemo(
    () => [...proposalsById.values()].map(proposalToInvestigation),
    [proposalsById]
  );

  // Header count: pending groups only — closed proposals are excluded.
  // "3 actions need you" must not count decisions already made.
  const openCount = useMemo(
    () =>
      Object.entries(data?.groups ?? {}).reduce(
        (sum, [key, items]) => (key === CLOSED_GROUP_KEY ? sum : sum + items.length),
        0
      ),
    [data?.groups]
  );

  const onClickAction: BaseActionsProps['onClickAction'] = useCallback(
    (action, recordId, assignee = null) => {
      setModalState({ type: action, recordId, assignee });
    },
    [setModalState]
  );

  const onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'] =
    useCallback(
      ({ id }) => {
        setSelectedIdForRecommendedAction(id);
      },
      [setSelectedIdForRecommendedAction]
    );

  const closeDetails = useCallback(() => setSelectedIdForDetails(undefined), []);

  const selectedDetailsConversation = useMemo(
    () =>
      selectedIdForDetails ? conversations.find((c) => c.id === selectedIdForDetails) : undefined,
    [conversations, selectedIdForDetails]
  );

  const selectedRecommendedActionConversation = useMemo(
    () =>
      selectedIdForRecommendedAction
        ? conversations.find((c) => c.id === selectedIdForRecommendedAction)
        : undefined,
    [conversations, selectedIdForRecommendedAction]
  );

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
    <AlertZeroPageSection
      contentProps={{
        css: css`
          padding-block: ${euiTheme.size.xxl};
          align-self: center;
          max-width: 1000px;
        `,
      }}
    >
      {selectedIdForRecommendedAction && selectedRecommendedActionConversation && (
        <ApprovalModal
          selectedRecommendedActionConversation={selectedRecommendedActionConversation}
          onConfirm={() => {
            const proposal = proposalsById.get(selectedIdForRecommendedAction);
            approve.mutate(
              { id: selectedIdForRecommendedAction, body: { actionInput: proposal?.actionInput } },
              { onSettled: () => setSelectedIdForRecommendedAction(undefined) }
            );
          }}
          onClose={() => setSelectedIdForRecommendedAction(undefined)}
        />
      )}

      {selectedDetailsConversation && (
        <InvestigationDetailsFlyout
          investigation={selectedDetailsConversation}
          onClose={closeDetails}
        />
      )}

      {modalState.type === 'assign' && modalState.recordId && (
        <AssignActionModal
          recordId={modalState.recordId}
          initialAssignee={modalState.assignee}
          onClose={() => setModalState({ type: null, recordId: null })}
          onAssign={() => {
            // TODO: use assign action API call hook
            setModalState({ type: null, recordId: null });
          }}
        />
      )}

      {modalState.type === 'dismiss' && modalState.recordId && (
        <DismissProposalModal
          proposalId={modalState.recordId}
          onClose={() => setModalState({ type: null, recordId: null })}
          onConfirm={({ dismissReason, rationale }) =>
            dismiss.mutate(
              { id: modalState.recordId!, body: { dismissReason, rationale } },
              { onSettled: () => setModalState({ type: null, recordId: null }) }
            )
          }
        />
      )}

      <EuiFlexGroup gutterSize="l" direction="column" wrap>
        <EuiFlexItem grow={false}>
          <AlertZeroPageHeader
            isLoading={isLoading}
            // Keep the count visible during a background refetch: only hide it
            // when there is an error AND no previously-loaded data to show.
            hasError={Boolean(error) && !data}
            isQueueEmpty={conversations.length === 0}
            eventCount={openCount}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ProposalsTrendChartRow />
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

        {error && !data ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt iconType="warning" title={<h2>{QUEUE_PAGE_INFO.loadError}</h2>} />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !(error && !data) && filteredQueueItems.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt
              iconType="chartTagCloud"
              title={<h2>{QUEUE_PAGE_INFO.emptyQueue}</h2>}
            />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !(error && !data)
          ? groupedBriefingItems.map((group) => (
              <EuiFlexItem key={group.id} grow={false}>
                <ConversationQueue
                  briefingId={group.id}
                  briefingType={group.id}
                  briefingList={group.items}
                  isFiltered={filteredQueueItems.length !== sortedConversations.length}
                  onClickRecommendedAction={onClickRecommendedAction}
                  onClickAction={onClickAction}
                  onClickCard={setSelectedIdForDetails}
                  selectedId={selectedIdForDetails}
                />
              </EuiFlexItem>
            ))
          : null}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
