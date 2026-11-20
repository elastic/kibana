/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTwoFilesPatch } from 'diff';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  aesopSkillDiffInputSchema,
  aesopSkillDiffStepCommonDefinition,
} from '../../../../common/workflows/step_types/aesop_skill_diff/aesop_skill_diff_step_common';

interface SkillDiff {
  diff: string;
  lines_added: number;
  lines_removed: number;
  changed: boolean;
}

// A trailing newline keeps the last line from being reported as changed when
// only one side ends with one.
const withTrailingNewline = (text: string): string => (text.endsWith('\n') ? text : `${text}\n`);

export const diffSkillContent = ({
  skillId,
  currentContent,
  proposedContent,
  contextLines,
}: {
  skillId: string;
  currentContent: string;
  proposedContent: string;
  contextLines: number;
}): SkillDiff => {
  const current = withTrailingNewline(currentContent);
  const proposed = withTrailingNewline(proposedContent);
  if (current === proposed) {
    return { diff: '', lines_added: 0, lines_removed: 0, changed: false };
  }
  const fileName = `skills/${skillId}.md`;
  const diff = createTwoFilesPatch(
    `a/${fileName}`,
    `b/${fileName}`,
    current,
    proposed,
    undefined,
    undefined,
    { context: contextLines }
  );
  let linesAdded = 0;
  let linesRemoved = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) linesAdded++;
    if (line.startsWith('-') && !line.startsWith('---')) linesRemoved++;
  }
  return { diff, lines_added: linesAdded, lines_removed: linesRemoved, changed: true };
};

export const aesopSkillDiffStepDefinition = createServerStepDefinition({
  ...aesopSkillDiffStepCommonDefinition,
  handler: async (context) => {
    const parsed = aesopSkillDiffInputSchema.safeParse(context.input);
    if (!parsed.success) {
      return { error: new Error(`Invalid input: ${parsed.error.message}`) };
    }
    const { skill_id: skillId, current_content, proposed_content, context_lines } = parsed.data;
    return {
      output: diffSkillContent({
        skillId,
        currentContent: current_content,
        proposedContent: proposed_content,
        contextLines: context_lines,
      }),
    };
  },
});
