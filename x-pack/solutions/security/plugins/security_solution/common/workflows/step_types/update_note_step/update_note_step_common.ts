/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import {
  MAX_DOCUMENT_ID_LENGTH,
  MAX_NOTE_ID_LENGTH,
  MAX_NOTE_TEXT_LENGTH,
  MAX_WORKFLOW_MESSAGE_LENGTH,
} from '../common/constants';

export const UpdateNoteStepId = 'security.updateNote' as const;

export const updateNoteInputSchema = z.object({
  note_id: z
    .string()
    .min(1)
    .max(MAX_NOTE_ID_LENGTH)
    .describe('The `savedObjectId` of the note to update.'),
  document_id: z
    .string()
    .min(1)
    .max(MAX_DOCUMENT_ID_LENGTH)
    .describe(
      'The Elasticsearch `_id` of the alert, attack, or document the note is attached to. Used to locate the note and preserve its associations.'
    ),
  text: z
    .string()
    .min(1)
    .max(MAX_NOTE_TEXT_LENGTH)
    .describe('The new text content of the note. Markdown is supported.'),
});

export const updateNoteOutputSchema = z.object({
  success: z.boolean(),
  note_id: z.string().optional().describe('The `savedObjectId` of the updated note.'),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const updateNoteStepCommonDefinition: BaseStepDefinition<
  typeof updateNoteInputSchema,
  typeof updateNoteOutputSchema
> = {
  id: UpdateNoteStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.updateNote.label', {
    defaultMessage: 'Update Note',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.updateNote.description', {
    defaultMessage: 'Update the text content of an existing note on an alert, attack, or document.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: updateNoteInputSchema,
  outputSchema: updateNoteOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.updateNote.documentation.details',
      {
        defaultMessage:
          "Updates the text of an existing note identified by `note_id` on the document (`document_id`) it is attached to. The note's document association is preserved. If the note belongs to a Timeline, that association is preserved as well.",
      }
    ),
    examples: [
      `## Update the text of a note on an alert
\`\`\`yaml
- name: update_note
  type: security.updateNote
  with:
    note_id: "{{ steps.create_alert_note.output.note_id }}"
    document_id: "{{ variables.alert_id }}"
    text: "Updated with enrichment findings: {{ steps.enrich.output.summary }}"
\`\`\``,
    ],
  },
};
