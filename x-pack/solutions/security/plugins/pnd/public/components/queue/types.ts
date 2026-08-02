/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { RecommendedAction } from '@kbn/pnd-common';

import type { PndHitlTone } from '../hitl_action_card/helpers/get_hitl_tone';

/**
 * One queue / chat row. Capability-driven: products inject title, description,
 * action definition and result vocabulary. The shared skeleton never takes a
 * product flag.
 *
 * PND fills `actionLabel` from `gate.actionLabel` via {@link queueEventFromProposal}.
 */
export interface QueueEvent {
  readonly actionIcon?: IconType;
  readonly actionLabel?: string;
  readonly actionTone?: PndHitlTone;
  readonly caseId: string;
  readonly description: string;
  readonly gateId?: string;
  readonly id: string;
  readonly recommendedAction?: RecommendedAction;
  readonly reversible?: boolean;
  readonly riskScore?: number;
  readonly threadConversationId?: string;
  readonly title: string;
}

/** A recorded decision. Present ⇒ the primary action hides and result text shows. */
export interface QueueDecision {
  readonly label: string;
}

/**
 * The parent conversation a {@link ThreadGroupCard} header *is*. No container-type
 * field: Aug 18 dropped type badges; nesting position carries the distinction.
 */
export interface QueueParent {
  readonly id: string;
  readonly riskScore?: number;
  readonly summary: string;
  readonly title: string;
}

export const QUEUE_GROUP_MODES = ['type', 'type-thread', 'thread'] as const;

export type QueueGroupMode = (typeof QUEUE_GROUP_MODES)[number];

export const DEFAULT_QUEUE_GROUP_MODE: QueueGroupMode = 'type';

export const QUEUE_GROUP_MODE_STORAGE_KEY = 'pnd.queue.groupMode';

/** Children visible before the `+N more` fold. Thread-mode only (Q7). */
export const THREAD_GROUP_FOLD_AFTER = 3;

export type QueueRiskBadgeSize = 'm' | 'ms' | 's';
