/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { usePndConversations } from '../../hooks/use_pnd_conversations';
import { usePndExecution } from '../../hooks/use_pnd_execution';
import { PndCorrelationUnavailableState, PndEmptyState, PndQueryState } from '../../states';
import { groupCatalogEntriesByPhase, PhaseGroup } from '../phase_group';
import { buildLifecycleRows } from './helpers/build_lifecycle_rows';
import { isCorrelationUnavailable } from './helpers/is_correlation_unavailable';
import { resolveRowConversation } from './helpers/resolve_row_conversation';
import { useOpenAgentBuilderConversation } from './hooks/use_open_agent_builder_conversation';
import { useTuningProposal } from './hooks/use_tuning_proposal';
import { LifecycleActionsEvidence } from './lifecycle_actions_evidence';
import { LifecycleStepRow } from './lifecycle_step_row';
import { LifecycleTuningEvidence } from './lifecycle_tuning_evidence';
import * as i18n from './translations';

/**
 * The row the drafted tuning is attached to: 4.3, the approval itself, whose subordinate line is the
 * `gate-apply-tuning` row. The evidence belongs where the decision is made, and rendering it on 4.2
 * as well would only duplicate it.
 */
export const TUNING_EVIDENCE_PHASE_STEP_ID = 'step-4-3';

/**
 * The row the containment ledger is attached to: 3.6, "Execute approved actions", whose
 * `collect_executed_actions` step is the step that writes the ledger. Not 3.5 — the review gate is
 * where the decision is asked, but the ledger records what the decision *did*.
 */
export const ACTIONS_EVIDENCE_PHASE_STEP_ID = 'step-3-6';

export interface LifecycleViewProps {
  /** Omitted when the host does not know which discovery to show yet. */
  correlationId?: string;
}

/**
 * The four-phase lifecycle of one Attack Discovery: all 14 catalog rows, grouped by phase, each with
 * an honest status and — for the twelve a PND step execution realizes — a link to that execution.
 *
 * Deliberately **container-agnostic**: no flyout chrome, no fixed width, no z-index. The
 * `/executions/:correlationId` route renders it full width and `LifecycleFlyoutHost` renders
 * the same component in an overlay over whatever list opened it, so the two can never drift.
 *
 * Grouping is client-side from `PHASE_CATALOG` because the response is a flat `steps` array with no
 * phase grouping. The catalog leads and the response overlays, so the view always shows the whole
 * documented lifecycle — which is the point: the gap between the four-phase document and the thin
 * slice is the thing being made legible.
 */
export const LifecycleView: React.FC<LifecycleViewProps> = ({ correlationId }) => {
  const { data, error, isLoading, refetch } = usePndExecution(correlationId);
  const { data: conversationsData } = usePndConversations({
    enabled: Boolean(correlationId),
  });
  const tuningEvidence = useTuningProposal(correlationId);
  const openConversation = useOpenAgentBuilderConversation();

  const rows = useMemo(() => buildLifecycleRows({ steps: data?.execution.steps ?? [] }), [data]);
  const rowByPhaseStepId = useMemo(() => new Map(rows.map((row) => [row.entry.id, row])), [rows]);
  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (!correlationId) {
    return (
      <PndEmptyState
        body={i18n.NO_DISCOVERY_BODY}
        iconType="aggregate"
        title={i18n.NO_DISCOVERY_TITLE}
      />
    );
  }

  const conversations = conversationsData?.conversations ?? [];
  const containmentActions = data?.containmentActions ?? [];

  /**
   * The evidence a row carries under its description: the drafted tuning while 4.3 is parked, and
   * the per-action containment ledger once 3.6 has one. At most one row renders each, and a row
   * with nothing to show renders nothing rather than an empty panel.
   */
  const resolveRowEvidence = (phaseStepId: string): React.ReactNode => {
    if (phaseStepId === TUNING_EVIDENCE_PHASE_STEP_ID && tuningEvidence != null) {
      return <LifecycleTuningEvidence evidence={tuningEvidence} />;
    }

    if (phaseStepId === ACTIONS_EVIDENCE_PHASE_STEP_ID && containmentActions.length > 0) {
      return <LifecycleActionsEvidence actions={containmentActions} />;
    }

    return undefined;
  };
  // The server's own answer wins over the client-side guess, in **both** directions: a `true` keeps
  // a legitimately-early run out of the could-not-correlate screen, and a `false` puts an older
  // discovery into it even if some row happens to name a run. The guess is only for a response that
  // carried no signal at all.
  const correlationUnavailable =
    data != null &&
    (data.isCorrelated === false ||
      (data.isCorrelated == null && isCorrelationUnavailable(data.execution.steps)));

  return (
    <div data-test-subj="pndLifecycleView">
      <PndQueryState
        emptyBody={i18n.NO_LIFECYCLE_BODY}
        emptyTitle={i18n.NO_LIFECYCLE_TITLE}
        error={error}
        // Emptiness means something specific here — "we could not correlate a run" — and it is
        // rendered as its own state below rather than as the generic empty prompt.
        isEmpty={false}
        isLoading={isLoading}
        loadingLabel={i18n.LOADING_LIFECYCLE}
        onRetry={onRetry}
      >
        {correlationUnavailable ? (
          <PndCorrelationUnavailableState onRetry={onRetry} />
        ) : (
          groupCatalogEntriesByPhase().map(({ entries, phase }) => (
            <React.Fragment key={phase}>
              <PhaseGroup count={entries.length} phase={phase}>
                {entries.flatMap((entry) => {
                  const row = rowByPhaseStepId.get(entry.id);

                  // no row of its own: this entry renders as a subordinate line under its primary
                  if (row == null) {
                    return [];
                  }

                  const conversation = resolveRowConversation({
                    correlationId,
                    conversations,
                    phaseStepId: entry.id,
                  });

                  return [
                    <LifecycleStepRow
                      evidence={resolveRowEvidence(entry.id)}
                      key={entry.id}
                      onOpenConversation={
                        conversation != null ? () => openConversation(conversation.id) : undefined
                      }
                      row={row}
                    />,
                  ];
                })}
              </PhaseGroup>
              <EuiSpacer size="m" />
            </React.Fragment>
          ))
        )}
      </PndQueryState>
    </div>
  );
};
