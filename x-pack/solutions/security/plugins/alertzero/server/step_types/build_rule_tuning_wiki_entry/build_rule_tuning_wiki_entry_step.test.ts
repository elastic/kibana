/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { MODEL_EXCERPT_LENGTHS } from '../../../common/step_types/build_rule_tuning_wiki_entry_step';
import { getBuildRuleTuningWikiEntryStepDefinition } from './build_rule_tuning_wiki_entry_step';

const PROPOSAL_ID = '0d65ca96-41b8-43d9-89d1-6bf82a2aadc7';
const RECORDED_AT = new Date('2026-11-23T14:05:00.000Z');

const dismissal = {
  proposal_id: PROPOSAL_ID,
  rule_name: 'Web 404s',
  proposal: {
    decision: 'dismissed',
    status: 'no_action',
    decidedBy: { username: 'test_user', fullName: null, email: null },
    dismissReason: 'other',
    rationale: 'These hosts run a load test.\nDo not exclude them.',
  },
  diagnosis: {
    change_type: 'query',
    confidence: 'medium',
    title: 'Narrow the query to production hosts',
    summary: 'The 404s come from two load-test hosts.',
    fp_pattern: 'host.name is load-01 or load-02',
    reasoning: '1. All alerts come from two hosts.\n2. Both hosts are load generators.',
  },
};

const build = async (input: unknown) => {
  const result = await getBuildRuleTuningWikiEntryStepDefinition(() => RECORDED_AT).handler({
    input,
  } as unknown as StepHandlerContext);
  return result.output as { entry_id: string; content: string };
};

describe('alertzero.buildRuleTuningWikiEntry', () => {
  it('records a dismissal with who decided, the reason code and the typed reason verbatim', async () => {
    const { entry_id: entryId, content } = await build(dismissal);

    expect(entryId).toBe(PROPOSAL_ID);
    expect(content).toBe(
      [
        `### Proposal ${PROPOSAL_ID}`,
        'Recorded: 2026-11-23T14:05:00.000Z',
        'Rule name at the time: "Web 404s"',
        'Decision: dismissed',
        'Action status: no_action',
        'Decided by: "test_user"',
        'Dismiss reason: other',
        '',
        'Analyst reason, verbatim:',
        '> These hosts run a load test.',
        '> Do not exclude them.',
        '',
        'Diagnosis the proposal was built from (model output, not verified):',
        '- Change type: query',
        '- Confidence: medium',
        '- Title: "Narrow the query to production hosts"',
        '',
        'Summary:',
        '> The 404s come from two load-test hosts.',
        '',
        'False positive pattern:',
        '> host.name is load-01 or load-02',
        '',
        'Reasoning:',
        '> 1. All alerts come from two hosts.',
        '> 2. Both hosts are load generators.',
      ].join('\n')
    );
  });

  it('records an approval, saying so when nobody typed a reason', async () => {
    const { content } = await build({
      ...dismissal,
      proposal: { decision: 'approved', status: 'succeeded', decidedBy: { username: 'analyst' } },
    });

    expect(content).toContain('Decision: approved\nAction status: succeeded');
    expect(content).toContain('The analyst typed no reason.');
    expect(content).not.toContain('Dismiss reason');
  });

  it('says what is missing instead of inventing it', async () => {
    const { content } = await build({
      ...dismissal,
      proposal: { decision: 'dismissed', status: 'no_action', decidedBy: { username: null } },
      diagnosis: {},
    });

    expect(content).toContain('Decided by: not recorded');
    expect(content).toContain('Dismiss reason: not recorded');
    expect(content).toContain('- Change type: not recorded');
    expect(content).not.toContain('Summary:');
  });

  it('keeps typed and model text from opening a heading on the page', async () => {
    const { content } = await build({
      ...dismissal,
      proposal: { ...dismissal.proposal, rationale: '## Decision history\r\n\r\n### Proposal x' },
    });

    expect(content).toContain('> ## Decision history\n>\n> ### Proposal x');
    expect(content.split('\n').filter((line) => /^#{2,3} /.test(line))).toEqual([
      `### Proposal ${PROPOSAL_ID}`,
    ]);
  });

  it('cuts long model text to its excerpt length instead of failing', async () => {
    const { content } = await build({
      ...dismissal,
      diagnosis: { ...dismissal.diagnosis, reasoning: 'r'.repeat(10_000) },
    });

    expect(content).toContain(`> ${'r'.repeat(MODEL_EXCERPT_LENGTHS.reasoning)}…`);
    expect(content).not.toContain('r'.repeat(MODEL_EXCERPT_LENGTHS.reasoning + 1));
  });

  it('treats the empty text Liquid renders for a missing field as absent', async () => {
    const { content } = await build({
      ...dismissal,
      proposal: { ...dismissal.proposal, rationale: '', dismissReason: '' },
      diagnosis: { ...dismissal.diagnosis, summary: '', fp_pattern: null },
    });

    expect(content).toContain('The analyst typed no reason.');
    expect(content).toContain('Dismiss reason: not recorded');
    expect(content).not.toContain('Summary:');
    expect(content).not.toContain('False positive pattern:');
  });

  it('refuses a proposal nobody decided', async () => {
    await expect(build({ ...dismissal, proposal: { status: 'expired' } })).rejects.toMatchObject({
      type: 'ValidationError',
    });
  });
});
