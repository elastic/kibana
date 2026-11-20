/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aesopSkillDiffStepDefinition, diffSkillContent } from './aesop_skill_diff_step';

type Context = Parameters<typeof aesopSkillDiffStepDefinition.handler>[0];

const run = (input: Record<string, unknown>) =>
  aesopSkillDiffStepDefinition.handler({ input } as unknown as Context);

describe('diffSkillContent', () => {
  it('returns a unified diff named after the skill', () => {
    const result = diffSkillContent({
      skillId: 'threat-hunting',
      currentContent: '# Hunt\n\nStep one.\nStep two.\n',
      proposedContent: '# Hunt\n\nStep one.\nStep two, with a time range.\n',
      contextLines: 3,
    });

    expect(result.changed).toBe(true);
    expect(result.lines_added).toBe(1);
    expect(result.lines_removed).toBe(1);
    expect(result.diff).toContain('--- a/skills/threat-hunting.md');
    expect(result.diff).toContain('+++ b/skills/threat-hunting.md');
    expect(result.diff).toContain('-Step two.');
    expect(result.diff).toContain('+Step two, with a time range.');
  });

  it('reports no change for identical content, ignoring a missing trailing newline', () => {
    expect(
      diffSkillContent({
        skillId: 's',
        currentContent: 'same\ntext',
        proposedContent: 'same\ntext\n',
        contextLines: 3,
      })
    ).toEqual({ diff: '', lines_added: 0, lines_removed: 0, changed: false });
  });

  it('counts only content lines, not the file headers', () => {
    const result = diffSkillContent({
      skillId: 's',
      currentContent: '',
      proposedContent: 'a\nb\n',
      contextLines: 0,
    });

    expect(result.lines_added).toBe(2);
    expect(result.lines_removed).toBe(1);
  });
});

describe('aesopSkillDiffStepDefinition', () => {
  it('diffs the input contents', async () => {
    const result = await run({
      skill_id: 'alert-triage',
      current_content: 'old\n',
      proposed_content: 'new\n',
    });

    expect(result).toEqual({
      output: expect.objectContaining({ changed: true, lines_added: 1, lines_removed: 1 }),
    });
  });

  it('returns an error for invalid input', async () => {
    const result = await run({ current_content: 'a', proposed_content: 'b' });

    expect(result).toEqual({ error: expect.any(Error) });
  });
});
