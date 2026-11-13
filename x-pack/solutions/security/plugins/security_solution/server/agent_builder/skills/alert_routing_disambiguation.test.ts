/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { alertAnalysisSkill } from './alert_analysis';
import { alertTriageSkill } from './alert_triage';

/**
 * Queue-prioritisation routing contract.
 *
 * "Which alerts should I look at first?" was routed to `alert-triage` in 5 of 6 model families
 * (Trajectory: `Missing tools: security.alerts. Extra tools: load_skill, security.alert-triage`),
 * and the triage tool's 24h default window turned that misroute into "no open alerts in the last
 * 24 hours, your queue is clear" — while the same run answered other examples with 285 open
 * alerts fetched through `security.alerts`. The example annotates `tool_sequence:
 * ['security.alerts']`, so the defect is skill selection, not reasoning.
 *
 * Skill selection happens before any skill content is read: the agent picks from the registered
 * skills' `id` + `description`. A phrasing claimed by two descriptions is therefore an ambiguous
 * route no matter how good either skill's guardrails are. This suite pins the split — plain
 * queue-listing and prioritisation phrasings belong to alert-analysis (answered from the alert
 * list with `security.alerts`), and only an explicit scored/ranked/grouped queue request may
 * claim alert-triage.
 */
const ANALYSIS_OWNED_PHRASINGS = [
  'which alerts should I look at first?',
  'what should I focus on?',
  'what is most urgent?',
];

/** Phrasings the alert-triage description used to claim; none of them may compete for the route. */
const TRIAGE_MUST_NOT_CLAIM = [
  ...ANALYSIS_OWNED_PHRASINGS,
  'which of these alerts should I look at?',
  'which alerts are most urgent?',
  'what alerts should I look at?',
];

/** Lowercase, drop quotes/punctuation, collapse whitespace: the description is prose, the phrasing is the contract. */
const normalise = (text: string): string =>
  text
    .toLowerCase()
    .replace(/["'`?.,:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const claims = (description: string, phrasing: string): boolean =>
  normalise(description).includes(normalise(phrasing));

describe('alert-analysis vs alert-triage skill routing', () => {
  describe('queue-prioritisation phrasings', () => {
    it.each(ANALYSIS_OWNED_PHRASINGS)(
      'are claimed by the alert-analysis description: %s',
      (phrasing) => {
        expect(claims(alertAnalysisSkill.description, phrasing)).toBe(true);
      }
    );

    it.each(TRIAGE_MUST_NOT_CLAIM)(
      'are NOT claimed by the alert-triage description: %s',
      (phrasing) => {
        expect(claims(alertTriageSkill.description, phrasing)).toBe(false);
      }
    );

    it('names the alert-list tool the analysis skill answers those questions with', () => {
      expect(normalise(alertAnalysisSkill.description)).toContain('security alerts');
      expect(alertAnalysisSkill.description).toContain('security.alerts');
    });
  });

  it('keeps alert-triage claimable for explicitly scored, ranked, or grouped queue requests', () => {
    const description = normalise(alertTriageSkill.description);
    for (const term of ['scored', 'ranked', 'weighted', 'grouped']) {
      expect(description).toContain(term);
    }
    expect(description).toContain('groups');
  });

  it('forbids the analysis path from answering those questions via the triage tool', () => {
    expect(alertAnalysisSkill.content).toMatch(
      /do not load or call the 'alert-triage' skill or 'security\.alert-triage' tool to answer them/
    );
  });

  it('has the triage skill defer plain alert-list questions to alert-analysis', () => {
    expect(alertTriageSkill.content).toMatch(/Do NOT use for plain alert-list questions/);
    expect(alertTriageSkill.content).toMatch(
      /alert-analysis skill answers those from the alert list/
    );
  });
});

describe('alert-triage zero-result reporting', () => {
  it('requires a named window instead of a bare "queue is clear" claim', () => {
    expect(alertTriageSkill.content).toMatch(/emptyResultNotice/);
    expect(alertTriageSkill.content).toMatch(
      /NEVER turn a zero inside a window into "your queue is clear"/
    );
  });

  it('carries the queried scope in the tool payload the model receives', async () => {
    // No alerts, no entity risk, no asset criticality — the misroute's real shape: the queue scan
    // inside the default 24h window matches nothing while the alert index is not empty.
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const context = {
      // The handler reads only these three: the ES client it queries through, the space it
      // scopes to, and a logger. Everything else in ToolHandlerContext is unreached.
      esClient: { asCurrentUser: { search } },
      spaceId: 'default',
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    } as unknown as ToolHandlerContext;

    const tools = await alertTriageSkill.getInlineTools!();
    const tool = tools[0] as BuiltinSkillBoundedTool;
    const result = (await tool.handler(
      { timeWindowHours: 24, maxAlerts: 100, workflowStatus: 'open' },
      context
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as { emptyResultNotice?: string };
    expect(search).toHaveBeenCalled();
    expect(data.emptyResultNotice).toContain('24h');
    expect(data.emptyResultNotice).toContain('does NOT mean the alert queue is empty');
  });
});
