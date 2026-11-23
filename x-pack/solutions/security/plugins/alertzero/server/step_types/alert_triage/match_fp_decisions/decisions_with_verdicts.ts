/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  FP_DECISION_BLOCKING_VERDICT_TAGS,
  FP_DECISION_ID_PREFIX,
  strictKeyTag,
} from '../../../alert_triage/fp_decisions';
import { findKeyTagsWithVerdicts } from '../ports';

type KibanaApi = Pick<StepHandlerContext['contextManager'], 'callKibanaApi'>;

/** Decisions per search: the key tags go in one `terms` clause, which stays far below its limit. */
const DECISIONS_PER_SEARCH = 500;

/**
 * Which of the given approved decisions have a key that an alert already carries with a true
 * positive or inconclusive verdict. The decision was approved on evidence from before, and a later
 * verdict for the same key is evidence against it. One search covers up to 500 decisions. A read
 * that fails throws, so the caller closes nothing on a guess.
 *
 * `shouldStop` is asked before each search. Once it answers true, the decisions that are not read
 * yet are left out of the result, so the caller must not act on them. It is meant for a work
 * deadline, which stays passed once it has passed.
 */
export const findDecisionsWithConflictingVerdicts = async (
  api: KibanaApi,
  decisionIds: readonly string[],
  shouldStop: () => boolean = () => false
): Promise<Set<string>> => {
  const found = new Set<string>();
  for (let from = 0; from < decisionIds.length; from += DECISIONS_PER_SEARCH) {
    if (shouldStop()) break;
    const idByKeyTag = new Map(
      decisionIds
        .slice(from, from + DECISIONS_PER_SEARCH)
        .map((id) => [strictKeyTag(id.slice(FP_DECISION_ID_PREFIX.length)), id])
    );
    const withVerdicts = await findKeyTagsWithVerdicts(
      api,
      [...idByKeyTag.keys()],
      FP_DECISION_BLOCKING_VERDICT_TAGS
    );
    withVerdicts.forEach((keyTag) => {
      const id = idByKeyTag.get(keyTag);
      if (id !== undefined) found.add(id);
    });
  }
  return found;
};
