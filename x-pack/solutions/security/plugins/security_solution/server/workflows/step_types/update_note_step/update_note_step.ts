/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { NOTE_URL } from '../../../../common/constants';
import { updateNoteStepCommonDefinition } from '../../../../common/workflows/step_types/update_note_step/update_note_step_common';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

export const updateNoteStepDefinition = createServerStepDefinition({
  ...updateNoteStepCommonDefinition,
  handler: async (context) => {
    const { note_id: noteId, text } = context.input;

    try {
      // `eventId` is intentionally omitted so the note's existing document
      // (alert/attack) association is preserved by the partial saved-object update.
      const { body } = await context.contextManager.callKibanaApi<{
        note?: { noteId?: string };
      }>({
        method: 'PATCH',
        path: NOTE_URL,
        body: {
          noteId,
          note: {
            note: text,
            timelineId: '',
          },
        },
      });

      return {
        output: {
          success: true,
          note_id: body?.note?.noteId ?? noteId,
          message: `Successfully updated note ${noteId}`,
        },
      };
    } catch (error) {
      throw toApiExecutionError(error, 'update note');
    }
  },
});
