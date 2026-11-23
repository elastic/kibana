/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_FINGERPRINT_AI_INDEX_ID,
  KNOWLEDGE_INDICATOR_AI_INDEX_ID,
} from '../../common/ai_indices';

/** An AI index AlertZero registers with Context Engine. */
export interface AlertZeroAiIndex<TId extends string = string> {
  id: TId;
  description: string;
  /**
   * Set when Context Engine has to scope the index's documents by space. AlertZero then installs
   * an index template that maps `permissions.kibana.privileges` as `nested`, and records a write
   * gate that stays closed until that template is installed. The plugin does not block writes
   * itself: the index's writer must check `isAiIndexWritable` on the start contract, or it can
   * auto-create the index from the base template before the nested one exists.
   */
  spaceScopedTemplate?: {
    /** Must never change once shipped. */
    templateName: string;
    logLabel: string;
  };
}

/**
 * Hunt writes indicators straight to the backing index, which never adds a registry entry.
 * Without one, `context-engine.updateKi` cannot resolve the id and the reviews' terminal status
 * writes fail.
 */
export const KNOWLEDGE_INDICATOR_AI_INDEX = {
  id: KNOWLEDGE_INDICATOR_AI_INDEX_ID,
  description:
    'Security knowledge indicators that AlertZero Watches hand to each other, such as ' +
    'detection coverage gaps and forensics handoffs.',
} as const satisfies AlertZeroAiIndex;

/**
 * The match step in security_solution searches and writes the backing index directly; this entry
 * is what makes the index managed so Context Engine resolves it.
 */
export const ATTACK_FINGERPRINT_AI_INDEX = {
  id: ATTACK_FINGERPRINT_AI_INDEX_ID,
  description:
    'Attack Discovery fingerprints used to attach a later attack to the Investigation ' +
    'that already describes it. Not a forensics handoff.',
  spaceScopedTemplate: {
    templateName: 'security-attack-fingerprint',
    logLabel: 'Attack fingerprint',
  },
} as const satisfies AlertZeroAiIndex;

/** One entry per index. */
export const ALERTZERO_AI_INDICES = [
  KNOWLEDGE_INDICATOR_AI_INDEX,
  ATTACK_FINGERPRINT_AI_INDEX,
] as const satisfies readonly AlertZeroAiIndex[];

export type AlertZeroAiIndexId = (typeof ALERTZERO_AI_INDICES)[number]['id'];
