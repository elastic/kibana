/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import {
  API_VERSIONS,
  type Investigation,
  type Proposal,
  type RecommendedAction,
} from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useInvestigations, useAllProposals } from '../../hooks/use_investigations_api';
import { DecisionRadar, decisionStateForStatus } from './components/decision_radar';
import type { DecisionState } from '../../theme';
import * as i18n from './translations';

const QUEUE_STATUSES = new Set([
  'open',
  'investigating',
  'in-progress',
  'escalated',
  // Deep Watch finished its forensic analysis and handed a recommendation back
  // to the analyst. The investigation stays on the queue because the human
  // still owns the containment decision (pending proposal awaiting approval).
  'deep-watch-complete',
]);
const AUTO_RESOLVED_STATUSES = new Set(['auto-resolved', 'closed']);

/**
 * Statuses that mean "an agent or analyst already recorded a decision here".
 *
 * Note `escalated` is deliberately *not* treated as pre-decision on the card
 * CTA: an investigation reaches `escalated` because a Watch tier handed it up,
 * and its proposals may already carry a terminal status (`approved`,
 * `escalated`, `executed`, `dismissed`). See `briefActionLabel`.
 */
const DECIDED_STATUSES = new Set([
  'escalated',
  'contained',
  'dismissed',
  ...AUTO_RESOLVED_STATUSES,
]);

export const isDecidedInvestigation = (investigation: Investigation): boolean =>
  (investigation.pendingProposalCount ?? 0) === 0 &&
  DECIDED_STATUSES.has(investigation.status ?? '');

/**
 * Single source of truth for the Brief card's primary button label.
 *
 * `primaryActionLabel` / `recommendedAction` are *pre-decision* fields — the
 * action a Watch tier recommends while the proposal is still `pending`. They
 * are not cleared when a decision lands (the proposal-decision routes update
 * the proposal document only), so rendering them unconditionally makes the
 * queue card contradict the investigation's own Proposals tab: the card said
 * "Isolate endpoint" while the only proposal on it already read "Escalated".
 *
 * When nothing is pending, the card offers to *review* the recorded decision
 * instead of re-offering an action the analyst already took.
 */
export const briefActionLabel = (investigation: Investigation): string => {
  if (investigation.status === 'deep-watch-complete') {
    return i18n.REVIEW_FINDINGS;
  }
  if (isDecidedInvestigation(investigation)) {
    return i18n.REVIEW_DECISION;
  }
  return investigation.primaryActionLabel ?? i18n.DEFAULT_ACTION;
};

const BUCKET_COLORS: Record<Exclude<i18n.BriefBucket, 'all'>, string> = {
  contain: 'danger',
  escalate: 'warning',
  investigate: 'primary',
  tune: 'accent',
  create: 'success',
};

const isQueueRow = (investigation: Investigation): boolean =>
  QUEUE_STATUSES.has(investigation.status ?? 'open');

const isAutoResolved = (investigation: Investigation): boolean =>
  AUTO_RESOLVED_STATUSES.has(investigation.status ?? '');

const matchesBucket = (
  action: RecommendedAction | undefined,
  bucket: i18n.BriefBucket
): boolean => {
  if (bucket === 'all') return true;
  return action === bucket;
};

/**
 * A unified queue row. Can represent either:
 * - A **pending Proposal** (the analyst's HITL decision item) — one row per
 *   pending proposal, with parent investigation context.
 * - An **Investigation with no pending proposals** — still actionable (open,
 *   investigating) but has no specific proposal awaiting a decision.
 *
 * Per the 2026-07-28 design/eng sync (ratified queue model): the analyst queue
 * shows Proposals first, one row per Proposal, drilling down to the parent
 * Investigation. An Investigation with multiple independent Proposals appears
 * multiple times.
 */
export interface QueueItem {
  /** Stable React key for this row. */
  key: string;
  /** The parent investigation — always present for context/parent chrome. */
  investigation: Investigation;
  /** The proposal this row represents, if this is a proposal-driven row. */
  proposal?: Proposal;
  /** Recommended action for bucket grouping. Falls back to investigation's. */
  recommendedAction: RecommendedAction | undefined;
  /** Sort priority (higher = more urgent). */
  priority: number;
  /** Affected surface for filter badges. */
  affectedSurface?: string;
  /** Click target — opens investigation detail (proposal tab if proposal row). */
  href: string;
}

/**
 * Build the unified queue from investigations + all proposals.
 *
 * Algorithm:
 * 1. Index investigations by id for O(1) parent lookup.
 * 2. Group proposals by parentConversationId (investigationId).
 * 3. For each pending proposal → emit one QueueItem (proposal-first).
 * 4. For each queue-status investigation with zero pending proposals → emit
 *    one QueueItem (investigation-only, no specific proposal to decide).
 * 5. Investigations with ≥1 pending proposal do NOT get their own row — their
 *    proposals do. This is the ratified queue model.
 */
export const buildQueueItems = (
  investigations: Investigation[],
  allProposals: Proposal[]
): QueueItem[] => {
  const investigationMap = new Map(investigations.map((inv) => [inv.id, inv]));

  // Group pending proposals by their parent investigation.
  const pendingByInvestigation = new Map<string, Proposal[]>();
  for (const proposal of allProposals) {
    if (proposal.status === 'pending') {
      const parentId = proposal.parentConversationId;
      const existing = pendingByInvestigation.get(parentId);
      if (existing) {
        existing.push(proposal);
      } else {
        pendingByInvestigation.set(parentId, [proposal]);
      }
    }
  }

  const items: QueueItem[] = [];

  // 1. One row per pending Proposal (proposal-first queue model).
  for (const [investigationId, proposals] of pendingByInvestigation) {
    const investigation = investigationMap.get(investigationId);
    if (!investigation) {
      continue;
    }
    for (const proposal of proposals) {
      const action = (proposal.type as RecommendedAction) ?? investigation.recommendedAction;
      items.push({
        key: proposal.id,
        investigation,
        proposal,
        recommendedAction: action,
        priority: investigation.priorityScore ?? Math.round((proposal.confidence ?? 0) * 100),
        affectedSurface: investigation.affectedSurface,
        href: `/investigations/${investigation.id}`,
      });
    }
  }

  // 2. Investigations in queue status with zero pending proposals → own row.
  for (const investigation of investigations) {
    if (!isQueueRow(investigation)) {
      continue;
    }
    const pending = pendingByInvestigation.get(investigation.id);
    if (pending && pending.length > 0) {
      // Already represented by its proposal rows — skip.
      continue;
    }
    items.push({
      key: investigation.id,
      investigation,
      recommendedAction: investigation.recommendedAction,
      priority: investigation.priorityScore ?? 0,
      affectedSurface: investigation.affectedSurface,
      href: `/investigations/${investigation.id}`,
    });
  }

  // Sort by priority descending.
  items.sort((a, b) => b.priority - a.priority);

  return items;
};

const BriefCard: React.FC<{
  item: QueueItem;
  accent: string;
  onOpen: () => void;
  onOpenChat: () => void;
}> = ({ item, accent, onOpen, onOpenChat }) => {
  const { investigation, proposal } = item;
  const inMotion = investigation.status === 'in-progress';
  const isDecided = isDecidedInvestigation(investigation);

  // When this is a proposal-driven row, the card shows the proposal's
  // recommendation + confidence, with parent investigation context (per
  // PR #82: "Proposal structured flyout refers to the parent Investigation
  // without replacing the Proposal as the selected object").
  const cardTitle = proposal
    ? proposal.recommendation || proposal.summary || investigation.title
    : investigation.title;

  return (
    <EuiPanel
      paddingSize="m"
      hasBorder
      onClick={onOpen}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={cardTitle}
      css={css`
        cursor: pointer;
        border-left: 3px solid ${accent};
      `}
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        {item.priority != null ? (
          <EuiFlexItem grow={false}>
            <div
              data-test-subj="pndBriefCardScore"
              css={css`
                display: flex;
                align-items: center;
                justify-content: center;
                inline-size: 26px;
                block-size: 26px;
                border-radius: 7px;
                font-size: 12px;
                font-weight: 700;
                color: ${accent};
                background-color: ${transparentize(accent, 0.12)};
              `}
            >
              {item.priority}
            </div>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{cardTitle}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {/* Parent investigation reference — per PR #82, proposal rows
                show parent investigation chrome (title, record id). */}
            {proposal && investigation.recordId ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {investigation.recordId}
                </EuiText>
              </EuiFlexItem>
            ) : null}
            {proposal ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="accent" data-test-subj="pndBriefCardProposalBadge">
                  {i18n.PROPOSAL}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {inMotion ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{i18n.IN_MOTION}</EuiBadge>
              </EuiFlexItem>
            ) : null}
            {investigation.pendingProposalCount > 0 && !proposal ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">
                  {i18n.pendingProposalsLabel(investigation.pendingProposalCount)}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {investigation.status === 'deep-watch-complete' ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="success" iconType="check">
                  {i18n.DEEP_WATCH_COMPLETE}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {isDecided ? (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color={investigation.status === 'escalated' ? 'warning' : 'default'}
                  data-test-subj="pndBriefCardDecidedBadge"
                >
                  {i18n.decidedStatusLabel(investigation.status)}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow />
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedRelative
                  value={proposal?.events?.[0]?.timestamp ?? investigation.updatedAt}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {investigation.summary && !proposal ? (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p>{investigation.summary}</p>
              </EuiText>
            </>
          ) : null}
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <strong>{i18n.WATCHED_BY}</strong> {i18n.watchTierLabel(investigation.watch_tier)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow />
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color={inMotion ? 'text' : 'primary'}
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onOpen();
                }}
              >
                {proposal ? proposal.recommendation : briefActionLabel(investigation)}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.OPEN_CHAT}
                iconType="comment"
                color="text"
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onOpenChat();
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const BriefPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { data: invData, isLoading: invLoading, error: invError } = useInvestigations();
  const { data: propData, isLoading: propLoading, error: propError } = useAllProposals();
  const [selectedBucket, setSelectedBucket] = useState<i18n.BriefBucket>('all');
  const [surfaceFilter, setSurfaceFilter] = useState<string | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<DecisionState | null>(null);
  usePndDocTitle(i18n.PAGE_TITLE);

  const investigations = useMemo(() => invData?.investigations ?? [], [invData?.investigations]);
  const allProposals = useMemo(() => propData?.proposals ?? [], [propData?.proposals]);

  const isLoading = invLoading || propLoading;
  const error = invError ?? propError;

  // Build the unified queue: one row per pending Proposal + investigations
  // with no pending proposals (ratified queue model, 2026-07-28 sync).
  const queueItems = useMemo(
    () => buildQueueItems(investigations, allProposals),
    [investigations, allProposals]
  );

  const autoResolvedCount = useMemo(
    () => investigations.filter(isAutoResolved).length,
    [investigations]
  );

  const bucketCounts = useMemo(() => {
    const counts: Record<Exclude<i18n.BriefBucket, 'all'>, number> = {
      contain: 0,
      escalate: 0,
      investigate: 0,
      tune: 0,
      create: 0,
    };
    for (const item of queueItems) {
      if (item.recommendedAction && item.recommendedAction in counts) {
        counts[item.recommendedAction] += 1;
      }
    }
    return counts;
  }, [queueItems]);

  const surfaces = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const item of queueItems) {
      const surface = item.affectedSurface?.trim();
      if (surface && !seen.has(surface)) {
        seen.add(surface);
        labels.push(surface);
      }
    }
    return labels;
  }, [queueItems]);

  const filtered = useMemo(
    () =>
      queueItems.filter((item) => {
        if (!matchesBucket(item.recommendedAction, selectedBucket)) return false;
        if (surfaceFilter && item.affectedSurface !== surfaceFilter) return false;
        if (decisionFilter && decisionStateForStatus(item.investigation.status) !== decisionFilter)
          return false;
        return true;
      }),
    [queueItems, selectedBucket, surfaceFilter, decisionFilter]
  );

  const grouped = useMemo(() => {
    const groups: Array<{
      id: Exclude<i18n.BriefBucket, 'all'>;
      label: string;
      items: QueueItem[];
    }> = [];
    for (const bucket of i18n.BRIEF_BUCKETS) {
      const items = filtered.filter((item) => item.recommendedAction === bucket.id);
      if (items.length > 0) {
        groups.push({ ...bucket, items });
      }
    }
    return groups;
  }, [filtered]);

  const bucketAccent = (bucket: Exclude<i18n.BriefBucket, 'all'>): string => {
    switch (bucket) {
      case 'contain':
        return euiTheme.colors.danger;
      case 'escalate':
        return euiTheme.colors.warning;
      case 'investigate':
        return euiTheme.colors.primary;
      case 'tune':
        return euiTheme.colors.accent;
      default:
        return euiTheme.border.color;
    }
  };

  return (
    <PndPageSection>
      <PndPageHeader
        title={
          <>
            {i18n.GREETING_PREFIX}{' '}
            <span
              css={css`
                font-weight: 700;
              `}
            >
              {i18n.greetingEmphasis(queueItems.length)}
            </span>
          </>
        }
        subtitle={
          autoResolvedCount > 0 ? i18n.autonomousSubline(autoResolvedCount) : i18n.CLEAR_SUBLINE
        }
      />

      <DecisionRadar
        investigations={queueItems.map((item) => item.investigation)}
        selected={decisionFilter}
        onSelect={setDecisionFilter}
      />
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color={selectedBucket === 'all' ? 'primary' : 'text'}
            flush="both"
            onClick={() => setSelectedBucket('all')}
          >
            {i18n.ALL_BUCKET}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {i18n.BRIEF_BUCKETS.map((bucket) => (
          <EuiFlexItem key={bucket.id} grow={false}>
            <EuiButton
              size="s"
              color={
                BUCKET_COLORS[bucket.id] as 'danger' | 'warning' | 'primary' | 'accent' | 'success'
              }
              fill={selectedBucket === bucket.id}
              onClick={() =>
                setSelectedBucket((current) => (current === bucket.id ? 'all' : bucket.id))
              }
            >
              {bucket.label} {bucketCounts[bucket.id]}
            </EuiButton>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      {surfaces.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            gutterSize="s"
            wrap
            responsive={false}
            alignItems="center"
            aria-label={i18n.AFFECTED_SURFACES}
          >
            {surfaces.map((surface) => (
              <EuiFlexItem key={surface} grow={false}>
                <EuiBadge
                  color={surfaceFilter === surface ? 'primary' : 'hollow'}
                  onClick={() =>
                    setSurfaceFilter((current) => (current === surface ? null : surface))
                  }
                  onClickAriaLabel={surface}
                >
                  {surface}
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
            <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {error ? <EuiEmptyPrompt iconType="alert" title={<h2>{i18n.LOAD_ERROR}</h2>} /> : null}

      {!isLoading && !error && filtered.length === 0 ? (
        <EuiEmptyPrompt iconType="visTagCloud" title={<h2>{i18n.EMPTY_BUCKET}</h2>} />
      ) : null}

      {!isLoading && !error
        ? grouped.map((group) => (
            <div key={group.id} css={{ marginBottom: euiTheme.size.l }}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    css={css`
                      text-transform: uppercase;
                      font-weight: 600;
                      letter-spacing: 0.55px;
                      color: ${euiTheme.colors.textSubdued};
                    `}
                  >
                    {group.label}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {group.items.length}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.pnd.brief.sectionBlurb"
                      defaultMessage="{count, plural, one {# item} other {# items}}"
                      values={{ count: group.items.length }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="s" />
              <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
                {group.items.map((item) => (
                  <EuiFlexItem key={item.key} grow={false}>
                    <BriefCard
                      item={item}
                      accent={bucketAccent(group.id)}
                      onOpen={() => history.push(item.href)}
                      onOpenChat={() => history.push('/chats')}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </div>
          ))
        : null}

      {/* ── Recently Approved (post-approval monitoring) ───────────── */}
      <RecentlyApprovedSection />
    </PndPageSection>
  );
};

// ── Recently Approved section ─────────────────────────────────────────
const RecentlyApprovedSection = () => {
  const [approved, setApproved] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchApproved = async () => {
      setLoading(true);
      try {
        const res = await fetch('/internal/pnd/investigations/proposals/approved', {
          headers: { 'Elastic-Api-Version': API_VERSIONS.internal.v1 },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setApproved(data.proposals ?? []);
        }
      } catch {
        // Silent fail — this section is additive.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchApproved();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiText color="subdued">
          <EuiLoadingSpinner size="s" />{' '}
          <FormattedMessage
            id="xpack.pnd.brief.recentlyApproved.loading"
            defaultMessage="Loading recently approved…"
          />
        </EuiText>
      </>
    );
  }

  if (approved.length === 0) return null;

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <strong>
          <FormattedMessage
            id="xpack.pnd.brief.recentlyApproved.title"
            defaultMessage="Recently Approved"
          />
        </strong>
      </EuiText>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        {approved.map((proposal) => (
          <EuiFlexItem key={proposal.id} grow={false}>
            <EuiPanel paddingSize="s" color="subdued">
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem>
                  <EuiText size="xs">{proposal.recommendation ?? proposal.id}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {proposal.decidedAt && (
                    <EuiText size="xs" color="subdued">
                      <FormattedRelative value={new Date(proposal.decidedAt)} />
                    </EuiText>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
