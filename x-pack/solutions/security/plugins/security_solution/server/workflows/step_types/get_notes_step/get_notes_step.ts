/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { NOTE_URL } from '../../../../common/constants';
import { getNotesStepCommonDefinition } from '../../../../common/workflows/step_types/get_notes_step/get_notes_step_common';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

interface ApiNote {
  noteId?: string | null;
  note?: string | null;
  eventId?: string | null;
  timelineId?: string | null;
  createdBy?: string | null;
  created?: number | null;
  updatedBy?: string | null;
  updated?: number | null;
  version?: string | null;
}

export const getNotesStepDefinition = createServerStepDefinition({
  ...getNotesStepCommonDefinition,
  handler: async (context) => {
    const { document_id: documentId } = context.input;

    try {
      const { body } = await context.contextManager.callKibanaApi<{
        totalCount?: number;
        notes?: ApiNote[];
      }>({
        method: 'GET',
        path: NOTE_URL,
        query: { documentIds: documentId },
      });

      const notes = (body?.notes ?? []).map((note) => ({
        note_id: note.noteId,
        text: note.note,
        document_id: note.eventId,
        timeline_id: note.timelineId,
        created_by: note.createdBy,
        created: note.created,
        updated_by: note.updatedBy,
        updated: note.updated,
        version: note.version,
      }));

      return {
        output: {
          success: true,
          total_count: body?.totalCount ?? notes.length,
          notes,
        },
      };
    } catch (error) {
      throw toApiExecutionError(error, 'get notes');
    }
  },
});
