/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { RULE_TUNING_INVESTIGATE_SKILL_ID, RULE_TUNING_INVESTIGATE_TOOL_ID } from './constants';
import {
  assertInvestigateRuleCatalogState,
  readAgentBuilderCatalog,
} from './agent_builder_catalog';

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

const fetchWith = (response: unknown) => jest.fn(async () => response) as unknown as HttpHandler;

const failingFetch = () =>
  jest.fn(async () => {
    throw new Error('404 Not Found');
  }) as unknown as HttpHandler;

describe('readAgentBuilderCatalog', () => {
  it('reads skill ids and the tools they declare', async () => {
    const catalog = await readAgentBuilderCatalog({
      fetch: fetchWith({
        results: [
          { id: 'find-security-rules', tool_ids: ['security.alerts'] },
          { id: RULE_TUNING_INVESTIGATE_SKILL_ID, tool_ids: [RULE_TUNING_INVESTIGATE_TOOL_ID] },
        ],
      }),
      log,
    });

    expect(catalog).toMatchObject({
      readable: true,
      hasInvestigateRuleSkill: true,
      hasInvestigateRuleTool: true,
      investigateRuleReachable: true,
    });
    expect(catalog.skillIds).toEqual(['find-security-rules', RULE_TUNING_INVESTIGATE_SKILL_ID]);
  });

  it('treats a catalog that does not answer as unreadable, not as empty', async () => {
    // An empty catalog and an unreachable one mean opposite things for a 0.
    const catalog = await readAgentBuilderCatalog({ fetch: failingFetch(), log });

    expect(catalog).toMatchObject({ readable: false, investigateRuleReachable: false });
    expect(catalog.evidence).toContain('did not answer');
  });

  it('counts the skill as reachable even when no skill declares its tools', async () => {
    // The live catalog declares `security.alerts` under find-security-rules but not
    // `security.find_rules`, so tool_ids alone would misreport skill tools as absent.
    const catalog = await readAgentBuilderCatalog({
      fetch: fetchWith({ results: [{ id: RULE_TUNING_INVESTIGATE_SKILL_ID }] }),
      log,
    });

    expect(catalog.hasInvestigateRuleTool).toBe(false);
    expect(catalog.investigateRuleReachable).toBe(true);
  });

  it('counts the tool as reachable when another skill declares it', async () => {
    const catalog = await readAgentBuilderCatalog({
      fetch: fetchWith({ results: [{ id: 'other', tool_ids: [RULE_TUNING_INVESTIGATE_TOOL_ID] }] }),
      log,
    });

    expect(catalog.hasInvestigateRuleSkill).toBe(false);
    expect(catalog.investigateRuleReachable).toBe(true);
  });
});

describe('assertInvestigateRuleCatalogState', () => {
  const absentCatalog = { results: [{ id: 'find-security-rules' }] };
  const presentCatalog = { results: [{ id: RULE_TUNING_INVESTIGATE_SKILL_ID }] };

  it('warns (does not throw) when the skill is a known gap', async () => {
    const catalog = await assertInvestigateRuleCatalogState({
      fetch: fetchWith(absentCatalog),
      log,
      expected: false,
    });

    expect(catalog.investigateRuleReachable).toBe(false);
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('UNMEASURED'));
  });

  it('THROWS when the stack is supposed to carry the skill and does not', async () => {
    await expect(
      assertInvestigateRuleCatalogState({ fetch: fetchWith(absentCatalog), log, expected: true })
    ).rejects.toThrow(/supposed to carry/);
  });

  it('THROWS when the catalog cannot be read, so no 0 can be interpreted', async () => {
    await expect(
      assertInvestigateRuleCatalogState({ fetch: failingFetch(), log, expected: false })
    ).rejects.toThrow(/Could not read this stack's Agent Builder catalog/);
  });

  it('passes quietly once the stack carries the skill', async () => {
    const catalog = await assertInvestigateRuleCatalogState({
      fetch: fetchWith(presentCatalog),
      log,
      expected: true,
    });

    expect(catalog.investigateRuleReachable).toBe(true);
  });
});
