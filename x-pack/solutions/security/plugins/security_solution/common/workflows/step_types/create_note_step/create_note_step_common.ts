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
  MAX_NOTE_TEXT_LENGTH,
  MAX_WORKFLOW_MESSAGE_LENGTH,
} from '../common/constants';

export const CreateNoteStepId = 'security.createNote' as const;

export const createNoteInputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(MAX_NOTE_TEXT_LENGTH)
    .describe('The text content of the note. Markdown is supported.'),
  document_id: z
    .string()
    .min(1)
    .max(MAX_DOCUMENT_ID_LENGTH)
    .describe('The Elasticsearch `_id` of the alert, attack, or document to attach the note to.'),
});

export const createNoteOutputSchema = z.object({
  success: z.boolean(),
  note_id: z.string().optional().describe('The `savedObjectId` of the newly created note.'),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const createNoteStepCommonDefinition: BaseStepDefinition<
  typeof createNoteInputSchema,
  typeof createNoteOutputSchema
> = {
  id: CreateNoteStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.createNote.label', {
    defaultMessage: 'Create Note',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.createNote.description', {
    defaultMessage: 'Create a note on an alert, attack, or document.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: createNoteInputSchema,
  outputSchema: createNoteOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.createNote.documentation.details',
      {
        defaultMessage:
          'Creates a new note attached to the alert, attack, or document identified by its Elasticsearch `_id` (`document_id`). The `note_id` returned in the output can be used by later steps to update or delete the note.',
      }
    ),
    examples: [
      `## Create a note on an alert
\`\`\`yaml
- name: create_alert_note
  type: security.createNote
  with:
    text: "{{ steps.generate_summary.output.summary }}"
    document_id: "{{ variables.alert_id }}"
\`\`\``,
      `## Create a note on an attack
\`\`\`yaml
- name: create_attack_note
  type: security.createNote
  with:
    text: "Triaged automatically by the enrichment workflow."
    document_id: "{{ variables.attack_id }}"
\`\`\``,
    ],
  },
};
