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
import { MAX_NOTE_ID_LENGTH, MAX_WORKFLOW_MESSAGE_LENGTH } from '../common/constants';

export const DeleteNoteStepId = 'security.deleteNote' as const;

export const deleteNoteInputSchema = z.object({
  ids: z
    .union([
      z.string().min(1).max(MAX_NOTE_ID_LENGTH),
      z.array(z.string().min(1).max(MAX_NOTE_ID_LENGTH)).min(1),
    ])
    .describe('A single note `savedObjectId` or a list of IDs to support bulk deletion.'),
});

export const deleteNoteOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const deleteNoteStepCommonDefinition: BaseStepDefinition<
  typeof deleteNoteInputSchema,
  typeof deleteNoteOutputSchema
> = {
  id: DeleteNoteStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.deleteNote.label', {
    defaultMessage: 'Delete Note',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.deleteNote.description', {
    defaultMessage: 'Delete one or multiple notes, identified by their note IDs.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: deleteNoteInputSchema,
  outputSchema: deleteNoteOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.deleteNote.documentation.details',
      {
        defaultMessage:
          'Deletes one or more notes identified by their `savedObjectId`. Accepts either a single note ID or a list of IDs for bulk deletion.',
      }
    ),
    examples: [
      `## Delete a single note
\`\`\`yaml
- name: delete_note
  type: security.deleteNote
  with:
    ids: "{{ variables.note_id }}"
\`\`\``,
      `## Delete multiple notes
\`\`\`yaml
- name: delete_notes
  type: security.deleteNote
  with:
    ids:
      - "note-1"
      - "note-2"
\`\`\``,
    ],
  },
};
