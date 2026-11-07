/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  INVESTIGATE_RULE_SKILL_EXPECTED_IN_EVAL_STACK,
  RULE_TUNING_INVESTIGATE_SKILL_ID,
  RULE_TUNING_INVESTIGATE_TOOL_ID,
} from './constants';

/** Agent Builder's skills route (`publicApiPath` + `/skills` in @kbn/agent-builder-common). */
export const AGENT_BUILDER_SKILLS_API_PATH = '/api/agent_builder/skills';

/**
 * What this stack's Agent Builder catalog offers.
 *
 * `tool_ids` on the skills response is the *declared* tool list and is
 * incomplete for skill-inline tools (the live catalog lists
 * `security.find_rules` under no skill even though `find-security-rules` exists),
 * so reachability is "the skill is registered OR some skill declares the tool".
 */
export interface AgentBuilderCatalog {
  /** False when the skills route did not answer — an unreadable catalog proves nothing. */
  readable: boolean;
  skillIds: string[];
  toolIds: string[];
  hasInvestigateRuleSkill: boolean;
  hasInvestigateRuleTool: boolean;
  investigateRuleReachable: boolean;
  evidence: string;
}

const asSkillsResponse = (
  response: unknown
): { results?: Array<{ id?: string; tool_ids?: string[] }> } =>
  (response ?? {}) as { results?: Array<{ id?: string; tool_ids?: string[] }> };

export const readAgentBuilderCatalog = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<AgentBuilderCatalog> => {
  let results: Array<{ id?: string; tool_ids?: string[] }> = [];
  let readable = true;
  try {
    const response = await fetch<unknown>(AGENT_BUILDER_SKILLS_API_PATH, {
      method: 'GET',
      headers: { 'kbn-xsrf': 'true' },
    });
    results = asSkillsResponse(response).results ?? [];
  } catch (error) {
    readable = false;
    log.warning(
      `GET ${AGENT_BUILDER_SKILLS_API_PATH} failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const skillIds = results.map((skill) => skill.id).filter((id): id is string => Boolean(id));
  const toolIds = results.flatMap((skill) => skill.tool_ids ?? []);
  const hasInvestigateRuleSkill = skillIds.includes(RULE_TUNING_INVESTIGATE_SKILL_ID);
  const hasInvestigateRuleTool = toolIds.includes(RULE_TUNING_INVESTIGATE_TOOL_ID);

  return {
    readable,
    skillIds,
    toolIds,
    hasInvestigateRuleSkill,
    hasInvestigateRuleTool,
    investigateRuleReachable: hasInvestigateRuleSkill || hasInvestigateRuleTool,
    evidence:
      `${AGENT_BUILDER_SKILLS_API_PATH} ${
        readable ? `lists ${skillIds.length} skill(s)` : 'did not answer'
      }; skill "${RULE_TUNING_INVESTIGATE_SKILL_ID}": ` +
      `${hasInvestigateRuleSkill ? 'present' : 'ABSENT'}, tool ` +
      `"${RULE_TUNING_INVESTIGATE_TOOL_ID}": ` +
      `${hasInvestigateRuleTool ? 'present' : 'ABSENT'}`,
  };
};

/**
 * Fail loudly when the stack is *supposed* to carry the graded skill and does
 * not; warn loudly when it is a known gap, so a Tool Routing N/A is never
 * mistaken for a routing failure.
 *
 * Called from the spec's `beforeAll`: the Tool Routing evaluator itself reports
 * the distinction per example (score `null` → UNMEASURED), and this is the
 * once-per-run version of the same fact.
 */
export const assertInvestigateRuleCatalogState = async ({
  fetch,
  log,
  expected = INVESTIGATE_RULE_SKILL_EXPECTED_IN_EVAL_STACK,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  expected?: boolean;
}): Promise<AgentBuilderCatalog> => {
  const catalog = await readAgentBuilderCatalog({ fetch, log });

  if (!catalog.readable) {
    throw new Error(
      `Could not read this stack's Agent Builder catalog (${catalog.evidence}), so neither the ` +
        `presence of "${RULE_TUNING_INVESTIGATE_SKILL_ID}" nor a Tool Routing 0 can be ` +
        `interpreted. Fix the stack before trusting this run.`
    );
  }

  if (expected && !catalog.investigateRuleReachable) {
    throw new Error(
      `The eval stack is supposed to carry "${RULE_TUNING_INVESTIGATE_SKILL_ID}" but its Agent ` +
        `Builder catalog does not: ${catalog.evidence}. The review's diagnose_rule step cannot ` +
        `call ${RULE_TUNING_INVESTIGATE_TOOL_ID}, so Tool Routing would score 0 on every example ` +
        `for an environment reason. Enable the skill in this suite's Scout config set ` +
        `(src/platform/packages/shared/kbn-scout/.../evals_detection_watch_rule_tuning/) or fix ` +
        `the stack, not the suite.`
    );
  }

  if (!catalog.investigateRuleReachable) {
    log.warning(
      `Tool Routing is UNMEASURED on this stack: ${catalog.evidence}. The graded tool cannot be ` +
        `called, so the evaluator reports N/A per example instead of 0 — enabling ` +
        `"${RULE_TUNING_INVESTIGATE_SKILL_ID}" in the eval config set is a separate change.`
    );
    return catalog;
  }

  log.info(`Graded tool reachable: ${catalog.evidence}`);
  if (!expected) {
    log.warning(
      `The catalog now carries "${RULE_TUNING_INVESTIGATE_SKILL_ID}" — flip ` +
        `INVESTIGATE_RULE_SKILL_EXPECTED_IN_EVAL_STACK to true so a regression fails loudly ` +
        `instead of silently un-measuring Tool Routing again.`
    );
  }

  return catalog;
};
