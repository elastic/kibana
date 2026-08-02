/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PND_GATE_IDS,
  type PndGateDefinition,
  type PndProposalRow,
  type PndTuningPreview,
} from '@kbn/pnd-common';

/**
 * Stable attachment ids, one per context artifact.
 *
 * Agent Builder's create route 409s on a duplicate id
 * (`agent_builder/server/routes/attachments.ts`, `stateManager.getAttachmentRecord(id)`), so naming
 * them deterministically makes "one set of three attachments" an invariant the platform enforces
 * rather than one D6's pre-read has to hold on its own. A retry that somehow reaches the create
 * step conflicts instead of adding a fourth attachment, and `createThreadAttachments` reads that
 * `409` as "already there".
 */
export const PND_THREAD_ATTACHMENT_IDS = {
  attackDiscovery: 'pnd-attack-discovery',
  backtestComparison: 'pnd-backtest-comparison',
  proposedChange: 'pnd-proposed-change',
} as const;

/** One `type: 'text'` attachment, in the shape Agent Builder's create route accepts. */
export interface PndThreadAttachmentInput {
  /** Agent Builder's `TextAttachmentData`. */
  data: { content: string };
  /** Human-readable label; what the Attachments tab lists. */
  description: string;
  /** One of {@link PND_THREAD_ATTACHMENT_IDS}. */
  id: string;
  type: 'text';
}

export interface BuildThreadAttachmentsParams {
  /** `buildAttackDiscoveryMarkdown(alert)` — the canonical renderer, never a second one. */
  attackDiscoveryMarkdown: string;
  gate: PndGateDefinition;
  /** The parked proposal row, when there is one. Absent is the normal eager case (D5). */
  proposal?: PndProposalRow;
}

/** One side of the backtest, as a line, or nothing when the count is not a real measurement. */
const backtestSide = (
  label: string,
  side: PndTuningPreview['before'] | undefined
): string | undefined => {
  if (typeof side?.alertCount !== 'number' || !Number.isFinite(side.alertCount)) {
    return undefined;
  }

  const window = side.from != null && side.to != null ? ` (${side.from} → ${side.to})` : '';

  return `${label}: ${side.alertCount} alerts${window}`;
};

/**
 * The backtest, or an explicit statement of why there is none.
 *
 * An unmeasured backtest is written out, never left blank and never rendered as a zero: a silent
 * absence reads as "no change expected", which is the opposite of the truth — the same rule
 * `BacktestComparison` follows in the browser.
 *
 * It does **not** read the workflow's own `notMeasured` reason, which that component does prefer
 * over its generic copy: `notMeasured` is on the browser-side preview type that
 * `parseTuningProposal` recovers from prose, not on the wire contract's `PndTuningPreview`
 * (`before` / `after` only). Reading it here would be a cast for a producer that does not exist —
 * `PndProposalRow.preview` has no producer at all today (finding R5's downstream half). When a
 * later contract revision puts it on the row, this is the line to change.
 */
const backtestContent = (gate: PndGateDefinition, proposal: PndProposalRow | undefined): string => {
  if (gate.gateId !== PND_GATE_IDS.applyTuning) {
    return 'This gate proposes no detection-rule change, so there is nothing to backtest.';
  }

  const sides = [
    backtestSide('Before (rule as it is today)', proposal?.preview?.before),
    backtestSide('After (rule with the proposed change)', proposal?.preview?.after),
  ].filter((line): line is string => line != null);

  if (sides.length > 0) {
    return sides.join('\n');
  }

  return [
    'No backtest was measured for this tuning.',
    'The watch runs the rule preview itself, over one window anchored at the moment the incident was contained, and writes both counts into the rationale above rather than onto this row — so this attachment can be empty even for a tuning that was measured. Read the counts from the "Backtest" section of the rationale.',
    'A tuning that rewrites no query has no backtest by design: only a query change alters which documents the rule matches, so there is nothing for a before/after alert count to compare.',
  ].join('\n');
};

/** What the watch proposed, in full — the analyst's copy of the rationale the prompt clipped. */
const proposedChangeContent = (
  gate: PndGateDefinition,
  proposal: PndProposalRow | undefined
): string => {
  if (proposal == null) {
    return [
      `Gate: ${gate.gateId}`,
      'The gate has not parked yet, so the watch has not written what it is proposing. This attachment is seeded when the thread is created, which happens before the gate parks (D5).',
    ].join('\n');
  }

  return [
    `Gate: ${gate.gateId}`,
    `Question: ${proposal.message}`,
    '',
    // Verbatim and unclipped: from Detection Watch v4 the rationale carries the anchored
    // `Rule name: … Rule id: … Proposed change: {json}` values, and re-rendering them here would be
    // a third copy of a cross-package contract that already fails silently when either side drifts.
    proposal.reasoning,
  ].join('\n');
};

/**
 * The three context attachments `_ensure` creates on a thread (D10).
 *
 * PND both **creates and reads** real Agent Builder attachments — no platform change is needed,
 * because `POST /api/agent_builder/conversations/{id}/attachments` is a public route with an open
 * `type` and PND calls it as the caller (D7). These three are what the Attachments tab lists.
 *
 * **Always exactly three, on every gate.** Only `apply_tuning` proposes a rule change, so the other
 * three gates would naturally produce fewer — but a variable set makes the Attachments tab and the
 * idempotency check gate-dependent for no gain, and an attachment that says *why* there is no
 * backtest is more useful to an approver than a missing one. So the set is fixed and each artifact
 * states its own absence.
 *
 * **Divergence from D10's source table, recorded deliberately.** The plan names
 * `public/components/proposed_rule_change/` and `public/components/backtest_comparison/` as the
 * builders to reuse. Both are React components: importing them here would pull React and EUI into
 * the server bundle and cross the plugin's `public`/`server` boundary. The Attack Discovery
 * attachment *does* reuse the real builder (`buildAttackDiscoveryMarkdown`, itself a wrapper over
 * `getAttackDiscoveryMarkdown`), and the other two render the same facts those components render,
 * from the same `PndProposalRow` fields, in text. No markdown *generator* is duplicated — the
 * rationale is carried verbatim rather than re-rendered.
 */
export const buildThreadAttachments = ({
  attackDiscoveryMarkdown,
  gate,
  proposal,
}: BuildThreadAttachmentsParams): PndThreadAttachmentInput[] => [
  {
    data: {
      content:
        attackDiscoveryMarkdown.trim() === ''
          ? 'The Attack Discovery could not be rendered when this thread was created.'
          : attackDiscoveryMarkdown,
    },
    description: 'Attack Discovery',
    id: PND_THREAD_ATTACHMENT_IDS.attackDiscovery,
    type: 'text',
  },
  {
    data: { content: proposedChangeContent(gate, proposal) },
    description:
      gate.gateId === PND_GATE_IDS.applyTuning ? 'Proposed rule change' : 'Proposed action',
    id: PND_THREAD_ATTACHMENT_IDS.proposedChange,
    type: 'text',
  },
  {
    data: { content: backtestContent(gate, proposal) },
    description: 'Backtest comparison',
    id: PND_THREAD_ATTACHMENT_IDS.backtestComparison,
    type: 'text',
  },
];
