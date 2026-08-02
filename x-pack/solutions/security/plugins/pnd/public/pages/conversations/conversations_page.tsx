/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  PndConversation,
  PndDiscoveryContext,
  PndProposalGroup,
  PndProposalRow,
  RecommendedAction,
} from '@kbn/pnd-common';

import { ConversationQueue } from '../../components/conversation_queue';
import type { RevealSectionRequest } from '../../components/conversation_queue';
import { BlastRadius } from '../../components/filters/blast_radius';
import type { PndBlastRadiusEntity } from '../../components/filters/blast_radius';
import { HitlActionModal } from '../../components/hitl_action_card/hitl_action_modal';
import { getPageColumnStyles } from '../../components/layout/helpers/get_page_column_styles';
import { getPageGutterStyles } from '../../components/layout/helpers/get_page_gutter_styles';
import { getPageSectionStackStyles } from '../../components/layout/helpers/get_page_section_stack_styles';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { buildLifecycleSearch } from '../../components/lifecycle_flyout';
import { PndPageHeader } from '../../components/pnd_page_header';
import { useApplyTuning } from '../../hooks/use_apply_tuning';
import { useDiscoveryContext } from '../../hooks/use_discovery_context';
import { usePndConversations } from '../../hooks/use_pnd_conversations';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import {
  useProposalHistory,
  useProposals,
  useRespondToProposal,
} from '../../hooks/use_proposals_api';
import { DemoModeBadge, PndQueryState, classifyQueryError, getErrorMessage } from '../../states';
import { ProposalKpiTiles } from './components/proposal_kpi_tiles';
import { ResolvedSection } from './components/resolved_section';
import { TuningApprovalDialog } from './components/tuning_approval_dialog';
import type { TuningApprovalConfirmation } from './components/tuning_approval_dialog';
import { WatchFilters } from './components/watch_filters';
import { buildConversationSearch } from '../chats/helpers/conversation_search_params';
import { applyTuningErrorMessage } from './helpers/apply_tuning_error_message';
import { filterGroupsByEntity } from './helpers/filter_groups_by_entity';
import { filterGroupsByWatch } from './helpers/filter_groups_by_watch';
import { decisionToastTitle } from './helpers/decision_toast_title';
import { readOpenedIncidentId } from './helpers/read_opened_incident_id';
import { readProposalDecision } from './helpers/read_proposal_decision';
import { readProposalRationale } from './helpers/read_proposal_rationale';
import { resolvedRows } from './helpers/resolved_rows';
import { useWatchFilter } from './hooks/use_watch_filter';
import * as i18n from './translations';

/** No enrichment read yet, as a stable identity so the per-row lookup is not rebuilt every render. */
const NO_CONTEXTS: PndDiscoveryContext[] = [];

/** No conversations read yet, for the same reason. Each investigation group then falls back to a heading. */
const NO_CONVERSATIONS: PndConversation[] = [];

/** The gate an analyst has opened the approval modal for. */
interface PendingApproval {
  /**
   * The answer the analyst gave in the modal, verbatim — present **only** once they have submitted
   * one, which is also the signal that the tuning dialog is what should be on screen. A `tune`
   * approval is two calls, and this is the first call's body, held while the analyst confirms which
   * detection rule it changes.
   */
  answer?: Record<string, unknown>;
  /**
   * `true` once `_respond` has succeeded for this gate. A `tune` approval is two
   * calls, and if the second fails the first must not be repeated: the gate has
   * already resumed, so a second `_respond` would 409 and hide the real error.
   */
  hasResponded: boolean;
  proposal: PndProposalRow;
}

/**
 * Whether this answer writes to a detection rule — the one decision in PND with a consequence
 * outside the workflow.
 *
 * A dismissal never does, so it is a single `_respond`. The decision comes out of the answer rather
 * than being chosen before the modal opens: the gate's own `inputSchema` says what answering means,
 * so which way it goes is not knowable until the analyst has said.
 */
const isTuningApproval = ({
  answer,
  proposal,
}: {
  answer: Record<string, unknown>;
  proposal: PndProposalRow;
}): boolean => readProposalDecision(answer) === 'approve' && proposal.recommendedAction === 'tune';

/**
 * What addresses the tuning proposal in `_apply`'s path.
 *
 * The discovery id, which is how the whole loop is keyed — except for a gate the
 * proposals route could not correlate to a discovery, which carries `''`. Falling
 * back to the `sourceId` keeps the url from having an empty path segment (which
 * would 404 on route matching rather than on the rule).
 */
const tuningProposalId = ({ correlationId, sourceId }: PndProposalRow): string =>
  correlationId.length > 0 ? correlationId : sourceId;

/**
 * PND's home page at `/`, and the real HITL approval queue — **the** queue, since round 3: the page
 * [#284440](https://github.com/elastic/kibana/pull/284440) shipped here and the Brief we shipped
 * beside it are now one page, at this path and under this exported name, with the design-aligned
 * internals and the real data path.
 *
 * It renders `GET /internal/pnd/proposals`, which groups pending gates into the four
 * `RecommendedAction` buckets. Those four are the {@link ProposalKpiTiles} counts; the queue below them
 * defaults to the same category axis (D7), with thread grouping available from the grouping control.
 * There is no fixture path **here**: `useInvestigations()` — the mock lane this page used to read —
 * returns `[]` unless `useMockData` is on, and keeping both would have put real gates beside fixture
 * investigations on one page. That hook and its samples stay for the surfaces that still address an
 * `Investigation`; only the live queue is consolidated.
 *
 * Two invariants the copy has to respect. Gates are strictly sequential — exactly
 * one `waitForInput` is pending per run — so this is **one card per parked run**,
 * not one per phase. And a 503 means the queue could not be read (Workflows
 * management is not wired, the expected status on a non-task-enabled dev stack),
 * never that it is empty; `PndQueryState` is what keeps those apart.
 *
 * **Two filters, applied in this order, and the order is the point.** The watch chips narrow the
 * queue; the blast radius chips narrow it further. The blast radius is derived from the
 * *watch*-filtered rows only, because deriving it from its own output would make most chips vanish
 * the moment one was pressed — the row would collapse to whatever the surviving rows happen to
 * share, and the analyst would be filtering by a set they can no longer see.
 *
 * **One enrichment read, three consumers** (decision D10). `discovery-context` is read here once,
 * for the discoveries the watch-filtered rows carry, and its body feeds the chips, every card's risk
 * badge and the approval modal's blast radius. `BlastRadius` reads it through the same hook and the
 * same react-query key rather than being handed the body, which is why it is given the same groups
 * this page derives the ids from: two different id lists would be two keys, and two requests.
 *
 * One decision is not like the others: approving a `tune` proposal changes a
 * production detection rule. Its answer opens {@link TuningApprovalDialog} rather than being sent,
 * and makes two calls rather than one — see {@link onConfirmTuning}. Every other decision,
 * including *dismissing* a tuning, is a single `_respond`.
 */
export const ConversationsPage: React.FC = () => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const { services } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { data, error, isLoading, refetch } = useProposals();
  const respond = useRespondToProposal();
  const applyTuning = useApplyTuning();
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const [decisionError, setDecisionError] = useState<string | undefined>(undefined);
  const [revealSection, setRevealSection] = useState<RevealSectionRequest | undefined>(undefined);
  const [activeEntity, setActiveEntity] = useState<PndBlastRadiusEntity | null>(null);
  usePndDocTitle(i18n.PAGE_TITLE);

  const groups = useMemo<PndProposalGroup[]>(() => data?.proposals.groups ?? [], [data]);
  const total = data?.proposals.total ?? 0;

  const { visible, watchFilter, ...watchFilters } = useWatchFilter(groups);

  /**
   * The record below the queue: `GET /internal/pnd/proposals/history`, narrowed by the **queue's**
   * chips rather than by its own.
   *
   * Read here rather than inside {@link ResolvedSection} so the two filters that narrow the queue
   * narrow the record with it — the record answers "what did we do about *this*", and a record that
   * ignored the host the analyst just filtered to would be answering a different question. It is not
   * gated on the queue's own state: a queue that is empty because everything has been answered is
   * exactly when the record is the whole page.
   */
  const { data: answered } = useProposalHistory();

  const correlationIds = useMemo(
    () => visible.flatMap(({ proposals }) => proposals.map(({ correlationId }) => correlationId)),
    [visible]
  );

  const { data: discoveryContext } = useDiscoveryContext({ correlationIds });
  const discoveryContexts = discoveryContext?.contexts ?? NO_CONTEXTS;

  /**
   * What each investigation group on the queue is **called** (D7).
   *
   * An investigation's name is its `[Investigation]` conversation's title, which the Watch Floor sets
   * deterministically to the Attack Discovery's own title, so this read is what lets a group header say
   * *which* investigation it is instead of every group repeating one generic heading. It is a label read and
   * nothing more: grouping is decided from the gate registry and the row's own discovery id, so a
   * failed or in-flight read leaves the headings on their fallback and moves no proposal (register
   * `#46`).
   *
   * Gated on there being a queue at all — an empty queue has no group to name — and read through the
   * same `usePndConversations` key the lifecycle flyout and the chats page use, so navigating between
   * them costs no second request.
   */
  const { data: conversationsData } = usePndConversations({ enabled: total > 0 });
  const conversations = conversationsData?.conversations ?? NO_CONVERSATIONS;

  const filtered = useMemo(
    () => filterGroupsByEntity({ entity: activeEntity, groups: visible }),
    [activeEntity, visible]
  );

  /** The answered gates the page's own filters leave, newest answer first. */
  const resolved = useMemo(
    () =>
      resolvedRows(
        filterGroupsByEntity({
          entity: activeEntity,
          groups: filterGroupsByWatch({
            groups: answered?.proposals.groups ?? [],
            watchFilter,
          }),
        })
      ),
    [activeEntity, answered, watchFilter]
  );

  const onRequestApproval = useCallback((proposal: PndProposalRow) => {
    setDecisionError(undefined);
    setPending({ hasResponded: false, proposal });
  }, []);

  const onCancelDecision = useCallback(() => {
    setDecisionError(undefined);
    setPending(null);
  }, []);

  /**
   * A KPI tile was pressed: ask the queue to expand the type section for that phase, and scroll to it.
   *
   * The counter is the request, not the action — see {@link RevealSectionRequest}. Held here rather
   * than inside the queue because the tiles are its sibling, and lifting the queue's whole open/closed
   * map up instead would take state away from the component that already owns the rule for it ("open,
   * unless the analyst said otherwise").
   */
  const onSelectSection = useCallback(
    (action: RecommendedAction) =>
      setRevealSection((current) => ({ action, requestId: (current?.requestId ?? 0) + 1 })),
    []
  );

  /** A blast radius chip was pressed: filter by that entity, or stop filtering by it. */
  const onToggleEntity = useCallback(
    (entity: PndBlastRadiusEntity) =>
      setActiveEntity((current) => (current?.id === entity.id ? null : entity)),
    []
  );

  const onViewLifecycle = useCallback(
    (correlationId: string) => {
      // The four-phase lifecycle opens as an **overlay** over the queue, so the row
      // an analyst was reading stays on screen behind it and Back closes it.
      // `LifecycleFlyoutHost` is already mounted above every PND route; the id
      // travels in the location's search string. This is `useOpenLifecycle` with
      // the id supplied at call time rather than bound at render time, which is
      // why it uses the same exported builder rather than the hook.
      history.push({ pathname, search: buildLifecycleSearch(search, correlationId) });
    },
    [history, pathname, search]
  );

  /**
   * The analyst answered the gate. The answer is the request body's `input`, verbatim.
   *
   * A `tune` **approval** is held rather than sent: it needs a rule id confirmed first, and it is
   * held here rather than decided before the modal opened because the modal is where the decision is
   * made (the gate's schema declares it, so approve and dismiss are the same button until it is
   * pressed).
   */
  const onConfirmAnswer = useCallback(
    async (answer: Record<string, unknown>) => {
      if (pending == null) {
        return;
      }

      const { proposal } = pending;

      if (isTuningApproval({ answer, proposal })) {
        setPending((previous) => (previous != null ? { ...previous, answer } : null));
        return;
      }

      try {
        await respond.mutateAsync({ input: answer, sourceId: proposal.sourceId });

        // The one answer that opens a container gets the one toast that carries a link (2026-08-17,
        // decision 6). `actionProps.primary` is core's own toast-action contract rather than a mounted
        // React node, so the link needs no render context of its own — which matters here, because a
        // toast is drawn outside this page's `Router` and could not call `useHistory` for itself.
        const openedIncidentId = readOpenedIncidentId({ answer, proposal });
        const title = decisionToastTitle({ answer, proposal });

        services.notifications?.toasts.addSuccess(
          openedIncidentId != null
            ? {
                actionProps: {
                  primary: {
                    children: i18n.INCIDENT_OPENED_TOAST_LINK,
                    'data-test-subj': 'pndIncidentOpenedToastLink',
                    onClick: () =>
                      history.push({
                        pathname: '/chats',
                        search: buildConversationSearch('', openedIncidentId),
                      }),
                  },
                },
                title,
              }
            : { title }
        );
        setPending(null);
        setDecisionError(undefined);
      } catch (mutationError) {
        const kind = classifyQueryError(mutationError);

        // 409 and 404 both mean the row on screen is stale, and the hook has
        // already invalidated the queue — so close the modal and say so, rather
        // than inviting a retry against a gate that has moved on.
        if (kind === 'conflict' || kind === 'notFound') {
          services.notifications?.toasts.addWarning({ title: i18n.ALREADY_ANSWERED_TOAST });
          setPending(null);
          setDecisionError(undefined);
          return;
        }

        // Anything else (403, 400, 500) keeps the modal — and the analyst's typed
        // rationale — on screen, with the reason in place.
        setDecisionError(getErrorMessage(mutationError, i18n.DECISION_FAILED_TOAST));
      }
    },
    [history, pending, respond, services.notifications]
  );

  /**
   * Approving a `tune` proposal is **two** calls, in this order: `_respond`
   * resumes the gate, then `_apply` changes the detection rule. That is the order
   * the plan specifies, and it is the safe one — the workflow's own audit append
   * follows the resume, so the run never sits parked behind a rule that has
   * already changed.
   *
   * The gate's answer goes to `_respond` as the analyst gave it, with the rationale this dialog
   * carried forward (and possibly corrected) replacing the modal's: the two calls are one decision,
   * so they record one reason.
   *
   * The interesting case is the second call failing after the first succeeded. The
   * gate is resumed by then and the queue row is already gone (a successful
   * `_respond` invalidates it), so this does **not** close the dialog and does not
   * retry `_respond`: the rule id is model-authored and a 404 is corrected right
   * there and applied again. It also raises a danger toast, because a rules-write
   * denial has to be visible even if the analyst closes the dialog — a failed
   * tuning must never look applied.
   */
  const onConfirmTuning = useCallback(
    async ({ change, rationale, ruleId }: TuningApprovalConfirmation) => {
      if (pending == null || pending.answer == null) {
        return;
      }

      const { answer, hasResponded, proposal } = pending;
      setDecisionError(undefined);

      if (!hasResponded) {
        try {
          await respond.mutateAsync({
            input: { ...answer, rationale },
            sourceId: proposal.sourceId,
          });
          setPending((previous) => (previous != null ? { ...previous, hasResponded: true } : null));
        } catch (respondError) {
          const kind = classifyQueryError(respondError);

          if (kind === 'conflict' || kind === 'notFound') {
            services.notifications?.toasts.addWarning({
              title: i18n.TUNING_GATE_ALREADY_ANSWERED,
            });
            setPending(null);
            return;
          }

          setDecisionError(getErrorMessage(respondError, i18n.DECISION_FAILED_TOAST));
          return;
        }
      }

      try {
        await applyTuning.mutateAsync({
          change,
          proposalId: tuningProposalId(proposal),
          rationale,
          ruleId,
        });

        services.notifications?.toasts.addSuccess({ title: i18n.TUNING_APPLIED_TOAST });
        setPending(null);
      } catch (applyError) {
        const message = applyTuningErrorMessage(applyError);

        services.notifications?.toasts.addDanger({
          text: message,
          title: i18n.TUNING_APPLY_FAILED_TITLE,
        });
        setDecisionError(message);
      }
    },
    [applyTuning, pending, respond, services.notifications]
  );

  return (
    <PndPageSection>
      {/* gutter outside, column inside: the gutter's inset has to shrink the box the column is
          centred within, so flattening the two would stop the column being centred */}
      <div css={getPageGutterStyles(euiTheme.size)}>
        <div css={[getPageColumnStyles(), getPageSectionStackStyles(euiTheme.size)]}>
          {/* The queue hero: the greeting and the count of what is waiting. `eventCount` is the
              **whole** queue rather than the filtered view — a watch chip is the analyst narrowing
              what they are reading, and a headline that dropped to "1 action needs you" because of a
              filter would be telling them the queue had emptied. The demo badge rides along, because
              a run that skipped the assessment must never present its verdict as a real one. */}
          <PndPageHeader
            badge={<DemoModeBadge />}
            eventCount={total}
            isLoading={isLoading}
            isQueueEmpty={!isLoading && total === 0}
          />

          <PndQueryState
            emptyTitle={i18n.EMPTY_TITLE}
            error={error}
            isAttackDiscoveryWorkflowsEnabled={data?.isAttackDiscoveryWorkflowsEnabled}
            isEmpty={total === 0}
            isLoading={isLoading}
            loadingLabel={i18n.LOADING}
            onRetry={refetch}
          >
            <ProposalKpiTiles
              groups={filtered}
              isFilterActive={activeEntity != null || watchFilter != null}
              onSelectSection={onSelectSection}
            />

            <WatchFilters
              {...watchFilters}
              watchFilter={watchFilter}
              watchesLabel={i18n.WATCHES_FILTER_LABEL}
            />

            {/* unboxed, and given the watch-filtered groups rather than the entity-filtered ones:
                it renders nothing at all when there is no enrichment, so a panel or a spacer pair
                around it would leave a hole behind */}
            <BlastRadius
              activeEntityId={activeEntity?.id ?? null}
              groups={visible}
              onToggleEntity={onToggleEntity}
            />

            <ConversationQueue
              conversations={conversations}
              discoveryContexts={discoveryContexts}
              groups={filtered}
              isFilterActive={activeEntity != null || watchFilter != null}
              onRequestApproval={onRequestApproval}
              onViewLifecycle={onViewLifecycle}
              revealSection={revealSection}
              resolvedProposals={resolved}
            />
          </PndQueryState>

          {/* outside the query state, because a queue that is empty *because* everything has been
              answered is exactly when the record is the only thing worth drawing */}
          <ResolvedSection onViewLifecycle={onViewLifecycle} rows={resolved} />
        </div>
      </div>

      {pending != null && pending.answer == null ? (
        <HitlActionModal
          discoveryContext={discoveryContexts.find(
            ({ correlationId }) => correlationId === pending.proposal.correlationId
          )}
          errorMessage={decisionError}
          isLoading={respond.isLoading}
          onCancel={onCancelDecision}
          onConfirm={onConfirmAnswer}
          proposal={pending.proposal}
        />
      ) : null}

      {pending?.answer != null ? (
        <TuningApprovalDialog
          errorMessage={decisionError}
          initialRationale={readProposalRationale(pending.answer)}
          isLoading={respond.isLoading || applyTuning.isLoading}
          onCancel={onCancelDecision}
          onConfirm={onConfirmTuning}
          proposal={pending.proposal}
        />
      ) : null}
    </PndPageSection>
  );
};
