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
    const { note_id: noteId, document_id: documentId, text } = context.input;

    try {
      // The persist API requires `timelineId` in the body and overwrites the note's
      // timeline reference with whatever is sent (an empty string detaches the note from
      // its Timeline). We therefore fetch the note first and echo its current `timelineId`
      // back unchanged. `eventId` is a plain attribute that the partial update preserves
      // when omitted, so we do not need to resend it.
      const { body: getBody } = await context.contextManager.callKibanaApi<{
        notes?: Array<{ noteId?: string; timelineId?: string | null }>;
      }>({
        method: 'GET',
        path: NOTE_URL,
        query: { documentIds: documentId },
      });

      const existingNote = (getBody?.notes ?? []).find((note) => note.noteId === noteId);

      if (!existingNote) {
        throw new Error(`Note ${noteId} was not found on document ${documentId}`);
      }

      const { body } = await context.contextManager.callKibanaApi<{
        note?: { noteId?: string };
      }>({
        method: 'PATCH',
        path: NOTE_URL,
        body: {
          noteId,
          note: {
            note: text,
            timelineId: existingNote.timelineId ?? '',
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
