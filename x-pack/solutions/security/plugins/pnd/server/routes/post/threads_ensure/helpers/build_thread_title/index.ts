/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_TITLE_MAX_LENGTH } from '@kbn/agent-builder-common';
import { PND_GATE_IDS, type PndGateDefinition, type PndGateId } from '@kbn/pnd-common';

import { clipToLength } from '../clip_to_length';

/**
 * How each gate's decision reads in the thread title set at creation.
 *
 * Keyed on `gateId` rather than on `recommendedAction`: the gate id is the identity a thread is
 * derived from (D1), and `Record<PndGateId, string>` makes a fifth gate a compile error here rather
 * than a silently generic title.
 */
const DECISION_PHRASES: Record<PndGateId, string> = {
  [PND_GATE_IDS.applyTuning]: 'applying a detection rule change',
  [PND_GATE_IDS.incidentContained]: 'confirming this incident is contained',
  [PND_GATE_IDS.openInvestigation]: 'opening an investigation',
  [PND_GATE_IDS.promoteIncident]: 'escalating this to an incident',
};

export interface BuildThreadTitleParams {
  /** Attack Discovery title, already clipped by `truncateAttackDiscoveryTitle`. */
  attackDiscoveryTitle: string;
  /** The gate whose proposal this thread is paired with, from `PND_GATE_REGISTRY`. */
  gate: PndGateDefinition;
}

/**
 * Deterministic title for a thread minted via `POST /api/agent_builder/conversations`.
 *
 * The create route accepts `title` at mint time, so this is the title an analyst reads — not an
 * agent-authored first-turn guess, and not a later `_rename` (D9). The decision phrase is what
 * distinguishes one thread from its parent investigation; the Attack Discovery title, when present,
 * names which discovery the decision is about. A blank title is omitted rather than rendered as an
 * empty label.
 */
export const buildThreadTitle = ({
  attackDiscoveryTitle,
  gate,
}: BuildThreadTitleParams): string => {
  const decision = `Decision on ${DECISION_PHRASES[gate.gateId]}`;
  const trimmed = attackDiscoveryTitle.trim();
  const title = trimmed === '' ? decision : `${decision}: ${trimmed}`;

  return clipToLength(title, CONVERSATION_TITLE_MAX_LENGTH);
};
