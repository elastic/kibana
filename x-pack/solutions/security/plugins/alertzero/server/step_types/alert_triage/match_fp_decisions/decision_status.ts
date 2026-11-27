/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRIAGE_DECISIONS_AI_INDEX_DEST } from '../../../../common/step_types/triage_decisions_index';
import { readActiveDecision, readLifecycle } from '../../../alert_triage/fp_decisions';
import { statusCodeOf } from '../ports';

/**
 * - `active`: in force.
 * - `gone`: revoked (its lifecycle is no longer active) or deleted.
 * - `lapsed`: not in force for another reason, most often because it expired. Alerts a decision
 *   handled while it was in force stay handled, so only `gone` is a reason to put them back.
 */
export type DecisionStatus = 'active' | 'gone' | 'lapsed';

interface DecisionReader {
  get: (params: {
    index: string;
    id: string;
  }) => Promise<{ _source?: Record<string, unknown> | undefined }>;
}

/**
 * Reads the decision by id, right now (a `get` is real time), and tells which of the three states
 * it is in. A read that fails other than with a 404 throws, so the caller acts on nothing.
 */
export const readDecisionStatus = async ({
  es,
  id,
  now,
}: {
  es: DecisionReader;
  id: string;
  now: number;
}): Promise<DecisionStatus> => {
  try {
    const { _source } = await es.get({ index: TRIAGE_DECISIONS_AI_INDEX_DEST.value, id });
    const lifecycle = readLifecycle(_source);
    if (lifecycle !== undefined && lifecycle !== 'active') return 'gone';
    return readActiveDecision({ id, source: _source, now }) !== undefined ? 'active' : 'lapsed';
  } catch (error) {
    if (statusCodeOf(error) === 404) return 'gone';
    throw error;
  }
};
