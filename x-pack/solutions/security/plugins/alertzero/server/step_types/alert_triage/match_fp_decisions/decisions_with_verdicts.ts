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

/**
 * Which of the given approved decisions have a key that an alert already carries with a true
 * positive or inconclusive verdict. The decision was approved on evidence from before, and a later
 * verdict for the same key is evidence against it. One search covers all the decisions. A read
 * that fails throws, so the caller closes nothing on a guess.
 */
export const findDecisionsWithConflictingVerdicts = async (
  api: KibanaApi,
  decisionIds: readonly string[]
): Promise<Set<string>> => {
  const idByKeyTag = new Map(
    decisionIds.map((id) => [strictKeyTag(id.slice(FP_DECISION_ID_PREFIX.length)), id])
  );
  const withVerdicts = await findKeyTagsWithVerdicts(
    api,
    [...idByKeyTag.keys()],
    FP_DECISION_BLOCKING_VERDICT_TAGS
  );
  return new Set([...withVerdicts].flatMap((keyTag) => idByKeyTag.get(keyTag) ?? []));
};
