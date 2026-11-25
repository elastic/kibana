/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { buildRuleTuningWikiEntryStepInputSchema } from '../../../common/step_types/build_rule_tuning_wiki_entry_step';

type BuildRuleTuningWikiEntryInput = z.output<typeof buildRuleTuningWikiEntryStepInputSchema>;

/** Blockquoted, so nothing the analyst or the model wrote can open a heading on the page. */
const quote = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n');

const quotedField = (label: string, text: string | undefined): string[] =>
  text === undefined ? [] : ['', `${label}:`, quote(text)];

/**
 * One Decision history entry: what the analyst decided and why, in their own words, next to the
 * diagnosis they decided on. Nothing is summarised or inferred; the diagnosis is quoted and
 * marked as unverified.
 */
export const buildRuleTuningWikiEntry = (
  {
    proposal_id: proposalId,
    rule_name: ruleName,
    proposal: { decision, status, decidedBy, dismissReason, rationale },
    diagnosis,
  }: BuildRuleTuningWikiEntryInput,
  recordedAt: Date
): { entry_id: string; content: string } => {
  const lines = [
    `### Proposal ${proposalId}`,
    `Recorded: ${recordedAt.toISOString()}`,
    `Rule name at the time: ${JSON.stringify(ruleName)}`,
    `Decision: ${decision}`,
    `Action status: ${status}`,
    `Decided by: ${decidedBy?.username ? JSON.stringify(decidedBy.username) : 'not recorded'}`,
    ...(decision === 'dismissed' ? [`Dismiss reason: ${dismissReason ?? 'not recorded'}`] : []),
    '',
    ...(rationale
      ? ['Analyst reason, verbatim:', quote(rationale)]
      : ['The analyst typed no reason.']),
    '',
    'Diagnosis the proposal was built from (model output, not verified):',
    `- Change type: ${diagnosis.change_type ?? 'not recorded'}`,
    `- Confidence: ${diagnosis.confidence ?? 'not recorded'}`,
    ...(diagnosis.title ? [`- Title: ${JSON.stringify(diagnosis.title)}`] : []),
    ...quotedField('Summary', diagnosis.summary),
    ...quotedField('False positive pattern', diagnosis.fp_pattern),
    ...quotedField('Reasoning', diagnosis.reasoning),
  ];
  return { entry_id: proposalId, content: lines.join('\n') };
};
