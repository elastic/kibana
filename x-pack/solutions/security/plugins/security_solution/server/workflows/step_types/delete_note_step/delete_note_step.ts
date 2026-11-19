/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { NOTE_URL } from '../../../../common/constants';
import { deleteNoteStepCommonDefinition } from '../../../../common/workflows/step_types/delete_note_step/delete_note_step_common';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

export const deleteNoteStepDefinition = createServerStepDefinition({
  ...deleteNoteStepCommonDefinition,
  handler: async (context) => {
    const { ids } = context.input;
    const noteIds = Array.isArray(ids) ? ids : [ids];

    try {
      await context.contextManager.callKibanaApi<Record<string, unknown>>({
        method: 'DELETE',
        path: NOTE_URL,
        body: { noteIds },
      });

      return {
        output: {
          success: true,
          message: `Successfully deleted ${noteIds.length} note(s)`,
        },
      };
    } catch (error) {
      throw toApiExecutionError(error, 'delete note');
    }
  },
});
