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
import { MAX_DOCUMENT_ID_LENGTH } from '../common/constants';

export const GetNotesStepId = 'security.getNotes' as const;

export const getNotesInputSchema = z.object({
  document_id: z
    .string()
    .min(1)
    .max(MAX_DOCUMENT_ID_LENGTH)
    .describe('The Elasticsearch `_id` of the alert, attack, or document to retrieve notes for.'),
});

const noteSchema = z.object({
  note_id: z.string().nullable().optional().describe('The `savedObjectId` of the note.'),
  text: z.string().nullable().optional().describe('The text content of the note.'),
  document_id: z
    .string()
    .nullable()
    .optional()
    .describe('The Elasticsearch `_id` of the document the note is attached to.'),
  timeline_id: z
    .string()
    .nullable()
    .optional()
    .describe('The `savedObjectId` of the Timeline the note belongs to, if any.'),
  created_by: z.string().nullable().optional().describe('The user who created the note.'),
  created: z
    .number()
    .nullable()
    .optional()
    .describe('When the note was created, as a 13-digit Epoch timestamp.'),
  updated_by: z.string().nullable().optional().describe('The user who last updated the note.'),
  updated: z
    .number()
    .nullable()
    .optional()
    .describe('When the note was last updated, as a 13-digit Epoch timestamp.'),
  version: z.string().nullable().optional().describe('The version of the note.'),
});

export const getNotesOutputSchema = z.object({
  success: z.boolean(),
  total_count: z.number().describe('The total number of notes returned.'),
  notes: z.array(noteSchema).describe('The notes attached to the document.'),
});

export const getNotesStepCommonDefinition: BaseStepDefinition<
  typeof getNotesInputSchema,
  typeof getNotesOutputSchema
> = {
  id: GetNotesStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.getNotes.label', {
    defaultMessage: 'Get Notes',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.getNotes.description', {
    defaultMessage: 'Retrieve all notes attached to a specific alert, attack, or document.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: getNotesInputSchema,
  outputSchema: getNotesOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.getNotes.documentation.details',
      {
        defaultMessage:
          'Retrieves all notes attached to the document identified by its Elasticsearch `_id` (an alert, attack, or any other document). Each note exposes its text, author, and timestamps so downstream steps can, for example, check whether a note already exists before writing a new one.',
      }
    ),
    examples: [
      `## Get all notes on an alert
\`\`\`yaml
- name: get_alert_notes
  type: security.getNotes
  with:
    document_id: "{{ variables.alert_id }}"
\`\`\``,
      `## Get all notes on an attack
\`\`\`yaml
- name: get_attack_notes
  type: security.getNotes
  with:
    document_id: "{{ variables.attack_id }}"
\`\`\``,
    ],
  },
};
