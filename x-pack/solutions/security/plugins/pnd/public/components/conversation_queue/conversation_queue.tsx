/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { EuiEmptyPrompt, euiCanAnimate, useEuiTheme } from '@elastic/eui';
import { CONVERSATION_CATEGORY_COLORS } from '@kbn/pnd-common';
import type {
  PndConversation,
  PndDiscoveryContext,
  PndProposalGroup,
  PndProposalRow,
  RecommendedAction,
} from '@kbn/pnd-common';
import { useHistory } from 'react-router-dom';

import { buildConversationSearch } from '../../pages/chats/helpers/conversation_search_params';
import {
  GroupControl,
  QueueRow,
  ThreadGroupCard,
  TypeSection,
  queueEventFromProposal,
  useQueueGroupMode,
  type QueueEvent,
  type QueueGroupMode,
} from '../queue';
import {
  groupProposalsByInvestigation,
  NO_INVESTIGATION_GROUP_KEY,
  type PndInvestigationGroup,
} from './helpers/group_proposals_by_investigation';
import { queueDecisionFromProposal } from './helpers/queue_decision_from_proposal';
import { readInvestigationId } from './helpers/read_investigation_id';
import { threadParentFromGroup } from './helpers/thread_parent_from_group';
import { visibleTypeSections } from './helpers/visible_type_sections';
import * as i18n from './translations';

/** How long a revealed group's border stays lit. Matches the prototype's 700ms pulse. */
export const SECTION_PULSE_MS = 700;

/** No enrichment read yet, as a stable identity so the lookup is not rebuilt every render. */
const NO_CONTEXTS: PndDiscoveryContext[] = [];

/** No conversations read yet, for the same reason. An investigation then falls back to its heading. */
const NO_CONVERSATIONS: PndConversation[] = [];

const NO_RESOLVED: PndProposalRow[] = [];

/**
 * A request from outside the queue to bring one phase's proposals into view: expand the section
 * holding them, and scroll to it.
 *
 * The `requestId` carries no meaning beyond "this is a different request from the last one", and it
 * is the whole reason a second click on the same KPI tile works.
 */
export interface RevealSectionRequest {
  action: RecommendedAction;
  requestId: number;
}

export interface ConversationQueueProps {
  /**
   * The PND-derived conversations in this space, from `GET /internal/pnd/conversations`. Read to
   * **name** a thread-card parent — never to decide which category a proposal belongs to.
   */
  conversations?: PndConversation[];
  /**
   * The `GET /internal/pnd/discovery-context` bodies for the discoveries on screen, from the page's
   * single read of it (D10). A row's risk badge is looked up here by `correlationId`.
   */
  discoveryContexts?: PndDiscoveryContext[];
  /**
   * The groups to draw, after the page's filters, as the route sends them: **sparse, and bucketed by
   * recommended action**.
   */
  groups: PndProposalGroup[];
  /**
   * True when a watch or blast-radius chip is pressed. Empty type sections then render with a zero
   * badge; when the queue is unfiltered they stay hidden.
   */
  isFilterActive?: boolean;
  /** Opens the approval modal, which owns the decision. Every pending row here is a parked gate. */
  onRequestApproval: (proposal: PndProposalRow) => void;
  onViewLifecycle: (correlationId: string) => void;
  /** The phase a KPI tile has asked for, if any. See {@link RevealSectionRequest}. */
  revealSection?: RevealSectionRequest;
  /**
   * Answered gates of the same investigations, for demote-in-place inside nested thread cards.
   * Never drawn in top-level type sections — those are pending-only; the Resolved section is
   * the record.
   */
  resolvedProposals?: readonly PndProposalRow[];
}

const investigationKeyOf = (proposal: PndProposalRow): string =>
  readInvestigationId(proposal) ?? NO_INVESTIGATION_GROUP_KEY;

/**
 * The HITL queue: three grouping modes composed from {@link TypeSection}, {@link QueueRow} and
 * {@link ThreadGroupCard}. Default is group-by-type (D7). Groups are pending-only; resolved
 * children demote only inside a nested card.
 */
export const ConversationQueue: React.FC<ConversationQueueProps> = ({
  conversations = NO_CONVERSATIONS,
  discoveryContexts = NO_CONTEXTS,
  groups,
  isFilterActive = false,
  onRequestApproval,
  onViewLifecycle,
  revealSection,
  resolvedProposals = NO_RESOLVED,
}) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { mode, onChange } = useQueueGroupMode();
  const [openOverrides, setOpenOverrides] = useState<Readonly<Record<string, boolean>>>({});
  const [pulsingKey, setPulsingKey] = useState<string | undefined>(undefined);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const riskScoreByDiscovery = useMemo(
    () =>
      new Map(
        discoveryContexts.flatMap(({ correlationId, riskScore }) =>
          riskScore == null ? [] : [[correlationId, riskScore] as const]
        )
      ),
    [discoveryContexts]
  );

  const typeSections = useMemo(
    () => visibleTypeSections({ groups, isFilterActive, riskScoreByDiscovery }),
    [groups, isFilterActive, riskScoreByDiscovery]
  );

  const investigationGroups = useMemo(
    () => groupProposalsByInvestigation({ groups, riskScoreByDiscovery }),
    [groups, riskScoreByDiscovery]
  );

  const pendingBySourceId = useMemo(
    () =>
      new Map(
        groups
          .flatMap(({ proposals }) => proposals)
          .map((proposal) => [proposal.sourceId, proposal])
      ),
    [groups]
  );

  const resolvedBySourceId = useMemo(
    () => new Map(resolvedProposals.map((proposal) => [proposal.sourceId, proposal])),
    [resolvedProposals]
  );

  const typeSectionsRef = useRef(typeSections);
  const investigationGroupsRef = useRef(investigationGroups);
  const modeRef = useRef(mode);

  useEffect(() => {
    typeSectionsRef.current = typeSections;
  }, [typeSections]);

  useEffect(() => {
    investigationGroupsRef.current = investigationGroups;
  }, [investigationGroups]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (revealSection == null) {
      return;
    }

    const { action } = revealSection;
    const currentMode = modeRef.current;

    if (currentMode === 'thread') {
      const revealed = investigationGroupsRef.current
        .filter(({ proposals }) =>
          proposals.some(({ recommendedAction }) => recommendedAction === action)
        )
        .map(({ key }) => key);

      if (revealed.length === 0) {
        return;
      }

      setOpenOverrides((current) => ({
        ...current,
        ...Object.fromEntries(revealed.map((key) => [key, true])),
      }));

      const [leading] = revealed;
      setPulsingKey(leading);
      sectionRefs.current[leading]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const section = typeSectionsRef.current.find(
      ({ action: sectionAction }) => sectionAction === action
    );

    if (section == null || section.count === 0) {
      return;
    }

    setOpenOverrides((current) => ({ ...current, [action]: true }));
    setPulsingKey(action);
    sectionRefs.current[action]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [revealSection]);

  useEffect(() => {
    if (pulsingKey == null) {
      return;
    }

    const timeoutId = window.setTimeout(() => setPulsingKey(undefined), SECTION_PULSE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [pulsingKey]);

  const onToggleSection = useCallback(
    (key: string, isOpen: boolean) =>
      setOpenOverrides((current) => ({ ...current, [key]: isOpen })),
    []
  );

  const toEvent = useCallback(
    (proposal: PndProposalRow): QueueEvent =>
      queueEventFromProposal({
        proposal,
        riskScore: riskScoreByDiscovery.get(proposal.correlationId),
      }),
    [riskScoreByDiscovery]
  );

  const onSelectEvent = useCallback(
    (event: QueueEvent) => {
      const proposal = pendingBySourceId.get(event.id);

      if (proposal != null) {
        onRequestApproval(proposal);
      }
    },
    [onRequestApproval, pendingBySourceId]
  );

  const onOpenChatEvent = useCallback(
    (event: QueueEvent) => {
      if (event.threadConversationId == null) {
        return;
      }

      history.push({
        pathname: '/chats',
        search: buildConversationSearch('', event.threadConversationId),
      });
    },
    [history]
  );

  const onOpenParent = useCallback(
    (parentId: string) => {
      history.push({
        pathname: '/chats',
        search: buildConversationSearch('', parentId),
      });
    },
    [history]
  );

  const onSelectChild = useCallback(
    (eventId: string) => {
      const pending = pendingBySourceId.get(eventId);

      if (pending != null) {
        onRequestApproval(pending);
        return;
      }

      const resolved = resolvedBySourceId.get(eventId);

      if (resolved != null && resolved.correlationId.length > 0) {
        onViewLifecycle(resolved.correlationId);
      }
    },
    [onRequestApproval, onViewLifecycle, pendingBySourceId, resolvedBySourceId]
  );

  const onChildApprovalRequest = useCallback(
    (event: QueueEvent) => {
      const proposal = pendingBySourceId.get(event.id);

      if (proposal != null) {
        onRequestApproval(proposal);
      }
    },
    [onRequestApproval, pendingBySourceId]
  );

  const resolvedForGroup = useCallback(
    (key: string): readonly QueueEvent[] =>
      resolvedProposals.filter((proposal) => investigationKeyOf(proposal) === key).map(toEvent),
    [resolvedProposals, toEvent]
  );

  const getLatestDecision = useCallback(
    (eventId: string) => {
      const proposal = resolvedBySourceId.get(eventId) ?? pendingBySourceId.get(eventId);

      return proposal == null ? undefined : queueDecisionFromProposal(proposal);
    },
    [pendingBySourceId, resolvedBySourceId]
  );

  const borderPulse = keyframes`
    0%,
    100% {
      border-color: ${euiTheme.border.color};
      box-shadow: 0 0 0 0 transparent;
    }
    35%,
    55% {
      border-color: ${euiTheme.colors.primary};
      box-shadow: 0 0 0 1px ${euiTheme.colors.primary};
    }
  `;

  const pulseStyles = css`
    ${euiCanAnimate} {
      animation: ${borderPulse} ${SECTION_PULSE_MS}ms ease;
    }
  `;

  const emptyPrompt = (
    <EuiEmptyPrompt
      body={<p>{i18n.NO_MATCHES_BODY}</p>}
      data-test-subj="pndBriefNoMatches"
      iconType="filter"
      title={<h2>{i18n.NO_MATCHES_TITLE}</h2>}
      titleSize="xs"
    />
  );

  const renderThreadCard = ({
    embedded,
    investigationGroup,
  }: {
    embedded: boolean;
    investigationGroup: PndInvestigationGroup;
  }) => {
    const { key, proposals } = investigationGroup;
    const riskScore =
      investigationGroup.correlationId == null
        ? undefined
        : riskScoreByDiscovery.get(investigationGroup.correlationId);

    return (
      <div
        css={pulsingKey === key ? pulseStyles : undefined}
        data-test-subj={`pndQueueThreadGroup-${key}`}
        key={key}
        ref={(element) => {
          sectionRefs.current[key] = element;
        }}
      >
        <ThreadGroupCard
          embedded={embedded}
          getLatestDecision={getLatestDecision}
          onChildApprovalRequest={onChildApprovalRequest}
          onOpenChat={onOpenParent}
          onOpenParent={onOpenParent}
          onSelectChild={onSelectChild}
          parent={threadParentFromGroup({
            conversations,
            investigationGroup,
            riskScore,
          })}
          pendingChildren={proposals.map(toEvent)}
          resolvedChildren={resolvedForGroup(key)}
        />
      </div>
    );
  };

  const renderTypeMode = (groupMode: QueueGroupMode) => {
    if (typeSections.length === 0) {
      return emptyPrompt;
    }

    return typeSections.map((section) => {
      const { action, count, label, proposals } = section;
      const nestedGroups =
        groupMode === 'type-thread'
          ? groupProposalsByInvestigation({
              groups: [{ proposals: [...proposals], recommendedAction: action }],
              riskScoreByDiscovery,
            })
          : [];

      return (
        <div
          css={pulsingKey === action ? pulseStyles : undefined}
          data-test-subj={`pndQueueReveal-${action}`}
          key={action}
          ref={(element) => {
            sectionRefs.current[action] = element;
          }}
        >
          <TypeSection
            count={count}
            dotColor={CONVERSATION_CATEGORY_COLORS[action]}
            isOpen={openOverrides[action] ?? true}
            label={label}
            onToggle={(isOpen) => onToggleSection(action, isOpen)}
            sectionId={action}
          >
            {groupMode === 'type'
              ? proposals.map((proposal) => {
                  const event = toEvent(proposal);

                  return (
                    <QueueRow
                      event={event}
                      grouped
                      key={proposal.sourceId}
                      onOpenChat={event.threadConversationId == null ? undefined : onOpenChatEvent}
                      onRequestApproval={onSelectEvent}
                      onSelect={() => onSelectEvent(event)}
                      onViewLifecycle={
                        proposal.correlationId.length > 0
                          ? () => onViewLifecycle(proposal.correlationId)
                          : undefined
                      }
                      selected={false}
                    />
                  );
                })
              : nestedGroups.map((investigationGroup) =>
                  renderThreadCard({ embedded: true, investigationGroup })
                )}
          </TypeSection>
        </div>
      );
    });
  };

  const renderThreadMode = () => {
    if (investigationGroups.length === 0) {
      return emptyPrompt;
    }

    return investigationGroups.map((investigationGroup) =>
      renderThreadCard({ embedded: false, investigationGroup })
    );
  };

  return (
    <>
      <div
        css={css`
          display: flex;
          justify-content: flex-end;
          margin-block-end: ${euiTheme.size.m};
        `}
      >
        <GroupControl onChange={onChange} value={mode} />
      </div>
      {mode === 'thread' ? renderThreadMode() : renderTypeMode(mode)}
    </>
  );
};
