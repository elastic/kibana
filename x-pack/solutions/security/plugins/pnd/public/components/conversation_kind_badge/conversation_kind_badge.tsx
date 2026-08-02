/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import type { PndConversation } from '@kbn/pnd-common';
import * as i18n from './translations';

/**
 * Every conversation kind this badge has presentation for: the three per-phase kinds keyed on
 * the Attack Discovery alert id, plus the gate-keyed `thread`.
 *
 * A thread is paired 1:1 with one HITL proposal rather than with a phase, so its presentation is
 * deliberately unlike the other three — a `neutral` color rather than a phase color, and a
 * description that points at the row's gate line, which is the only thing that says *which*
 * proposal it is (thread titles come from Agent Builder, and PND never renames a conversation to
 * encode kind or parentage).
 *
 * `satisfies` keeps the invariant this comment used to get from indexing
 * `CONVERSATION_KIND_PRESENTATION` with the generated union: every kind named here must
 * still be a kind the contract has, so a contract *rename* fails the type check here
 * instead of falling back at runtime. What it deliberately no longer requires is the
 * converse — the contract may carry kinds this badge does not present.
 */
export const PND_CONVERSATION_KINDS = [
  'incident',
  'investigation',
  'thread',
  'tuning',
] as const satisfies ReadonlyArray<PndConversation['kind']>;

export type PndConversationKindName = (typeof PND_CONVERSATION_KINDS)[number];

/**
 * Whether a `kind` off the wire is one of the kinds this badge presents.
 *
 * The narrowing `getConversationKindPresentation` needs now that the contract's union is wider
 * than {@link PndConversationKindName}. Written as `some` rather than `includes` so no cast is
 * needed to compare a `string` against the readonly tuple.
 */
export const isPndConversationKindName = (kind: string): kind is PndConversationKindName =>
  PND_CONVERSATION_KINDS.some((knownKind) => knownKind === kind);

export interface ConversationKindPresentation {
  color: NonNullable<EuiBadgeProps['color']>;
  /** Tooltip copy: which phase of the lifecycle this conversation belongs to. */
  description: string;
  label: string;
}

export const CONVERSATION_KIND_PRESENTATION: Record<
  PndConversationKindName,
  ConversationKindPresentation
> = {
  incident: {
    color: 'warning',
    description: i18n.INCIDENT_DESCRIPTION,
    label: i18n.INCIDENT_LABEL,
  },
  investigation: {
    color: 'primary',
    description: i18n.INVESTIGATION_DESCRIPTION,
    label: i18n.INVESTIGATION_LABEL,
  },
  // `neutral` rather than a fourth phase color, and the one badge color shared with no phase: a
  // thread is not a phase of the loop, and coloring it like one would imply an order it has none of.
  // It is also the only remaining value valid for **both** `EuiBadge` and the `EuiButton` filter
  // pills, which `index.test.tsx` pins to these colors.
  thread: {
    color: 'neutral',
    description: i18n.THREAD_DESCRIPTION,
    label: i18n.THREAD_LABEL,
  },
  tuning: {
    color: 'accent',
    description: i18n.TUNING_DESCRIPTION,
    label: i18n.TUNING_LABEL,
  },
};

const unknownPresentation = (kind: string): ConversationKindPresentation => ({
  color: 'default',
  description: i18n.unknownDescription(kind),
  label: i18n.UNKNOWN_LABEL,
});

export const getConversationKindPresentation = (
  kind: PndConversation['kind'] | PndConversationKindName
): ConversationKindPresentation =>
  isPndConversationKindName(kind)
    ? CONVERSATION_KIND_PRESENTATION[kind]
    : unknownPresentation(kind);

export interface ConversationKindBadgeProps {
  'data-test-subj'?: string;
  kind: PndConversation['kind'] | PndConversationKindName;
}

export const ConversationKindBadge: React.FC<ConversationKindBadgeProps> = ({
  'data-test-subj': dataTestSubj = 'pndConversationKindBadge',
  kind,
}) => {
  const { color, description, label } = getConversationKindPresentation(kind);

  return (
    <EuiToolTip content={description}>
      {/* `tabIndex` so the tooltip is reachable by keyboard: the badge itself is not interactive. */}
      <EuiBadge color={color} data-kind={kind} data-test-subj={dataTestSubj} tabIndex={0}>
        {label}
      </EuiBadge>
    </EuiToolTip>
  );
};
