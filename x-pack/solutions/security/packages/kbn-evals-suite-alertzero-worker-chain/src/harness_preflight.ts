/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { overrideInferenceFeature } from '@kbn/evals-suite-attack-discovery-fp-tp/src/inference_override';
import {
  ALERTZERO_AGENTIC_FEATURE_ID,
  ALERTZERO_REASONING_FEATURE_ID,
  INVESTIGATE_RULE_SKILL_ID,
  PUBLIC_API_VERSION,
  SKILLS_URL,
} from './constants';

/**
 * The Rule Tuning review pins `skill_ids: [investigate-rule]`, and that skill registers only
 * when `securitySolution.enableExperimental` carries `investigateRuleSkill` (off upstream).
 * Without it the agent can only propose manual changes and the TPSuppressedByTuning gate is
 * never exercised, which looks like a model result. Fail the run before it measures anything.
 */
export const assertInvestigateRuleSkillRegistered = async (fetch: HttpHandler): Promise<void> => {
  const { results } = (await fetch(SKILLS_URL, {
    method: 'GET',
    version: PUBLIC_API_VERSION,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
  })) as { results?: Array<{ id: string }> };
  if (!results?.some(({ id }) => id === INVESTIGATE_RULE_SKILL_ID)) {
    throw new Error(
      `Skill "${INVESTIGATE_RULE_SKILL_ID}" is not registered (GET ${SKILLS_URL} lists ` +
        `${results?.length ?? 0} skills). The Rule Tuning review needs it; start the stack with ` +
        'the evals_alertzero_worker_chain server config set (investigateRuleSkill).'
    );
  }
};

/**
 * Routes every inference feature the worker chain uses to the connector under test. The
 * Rule Tuning review resolves its model through `alertzero_agentic`, not `alertzero_reasoning`;
 * leaving it unbound measures whatever connector the stack defaults to.
 * Returns one restore that undoes the overrides in reverse order (each PUT replaces the document).
 */
export const bindWorkerChainInferenceFeatures = async (
  fetch: HttpHandler,
  endpointId: string
): Promise<() => Promise<void>> => {
  const restores: Array<() => Promise<void>> = [];
  const restoreAll = async () => {
    for (const restore of restores.splice(0).reverse()) await restore();
  };
  try {
    for (const featureId of [ALERTZERO_REASONING_FEATURE_ID, ALERTZERO_AGENTIC_FEATURE_ID]) {
      restores.push(await overrideInferenceFeature({ fetch, featureId, endpointId }));
    }
  } catch (error) {
    await restoreAll().catch(() => undefined);
    throw error;
  }
  return restoreAll;
};
