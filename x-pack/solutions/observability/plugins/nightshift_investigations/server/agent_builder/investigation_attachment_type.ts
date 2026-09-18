/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { InvestigationState } from '@kbn/significant-events-schema';
import {
  NIGHTSHIFT_INVESTIGATION_ATTACHMENT_ID,
  NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE,
  nightshiftInvestigationAttachmentSchema,
  type NightshiftInvestigationAttachmentData,
} from '../../common/investigation_attachment';

const formatHypotheses = (state: InvestigationState): string[] =>
  state.hypotheses.map((hypothesis) => {
    const confidence = `${Math.round(hypothesis.confidence * 100)}%`;
    const reason = hypothesis.reason ? ` — ${hypothesis.reason}` : '';
    return `- [${hypothesis.status}, ${confidence}] ${hypothesis.candidate}${reason}`;
  });

/**
 * The findings as the agent reads them on a follow-up turn. Evidence queries are deliberately
 * left out: they are long, and the agent re-derives them from its own tools when it needs them.
 */
export const formatInvestigationAsText = (data: NightshiftInvestigationAttachmentData): string => {
  const { state } = data;
  const hypotheses = formatHypotheses(state);

  return [
    `Investigation: ${data.investigation_id}`,
    state.severity ? `Severity: ${state.severity}` : undefined,
    '',
    `Summary: ${state.summary}`,
    state.conclusion ? `\nConclusion: ${state.conclusion}` : undefined,
    hypotheses.length > 0 ? `\nHypotheses:\n${hypotheses.join('\n')}` : undefined,
    state.recommendations?.length
      ? `\nRecommendations:\n${state.recommendations
          .map((recommendation) => `- ${recommendation.title}`)
          .join('\n')}`
      : undefined,
    state.blind_spots?.length
      ? `\nBlind spots:\n${state.blind_spots.map((spot) => `- ${spot.title}`).join('\n')}`
      : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
};

export const createInvestigationAttachmentType = (): AttachmentTypeDefinition<
  typeof NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE,
  NightshiftInvestigationAttachmentData
> => ({
  id: NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE,
  // Only the workflow writes findings; a user editing them would put the attachment and the
  // investigation record out of sync.
  isReadonly: true,
  validate: (input) => {
    const result = nightshiftInvestigationAttachmentSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatInvestigationAsText(attachment.data),
    }),
  }),
  // The inline card is what carries the button that opens the Canvas, and it is only rendered
  // where the response emits this tag — so the agent has to be told to emit it. The version is
  // deliberately omitted: the UI then resolves the latest, which is what a follow-up should show.
  getAgentDescription: () =>
    `A completed investigation of the current thread, carrying its summary, hypotheses, conclusion and recommendations. Treat it as the findings so far and build on it rather than restarting the investigation.\n\n` +
    `Rendering: emit <render_attachment id="${NIGHTSHIFT_INVESTIGATION_ATTACHMENT_ID}"/> once in your response so the findings are shown and can be opened in full.`,
});
