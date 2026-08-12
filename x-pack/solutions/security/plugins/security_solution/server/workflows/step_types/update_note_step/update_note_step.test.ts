/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { updateNoteStepDefinition } from './update_note_step';
import { NOTE_URL } from '../../../../common/constants';
import type { updateNoteInputSchema } from '../../../../common/workflows/step_types/update_note_step/update_note_step_common';

describe('updateNoteStepDefinition', () => {
  let mockContextManager: jest.Mocked<
    StepHandlerContext<typeof updateNoteInputSchema>['contextManager']
  >;
  let mockContext: StepHandlerContext<typeof updateNoteInputSchema>;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<StepHandlerContext<typeof updateNoteInputSchema>['contextManager']>;

    mockContext = {
      input: {
        note_id: 'note-1',
        text: 'Updated text',
      },
      contextManager: mockContextManager,
    } as unknown as StepHandlerContext<typeof updateNoteInputSchema>;
  });

  it('updates the note text without touching the document association', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { note: { noteId: 'note-1' } },
    });

    const result = await updateNoteStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'PATCH',
      path: NOTE_URL,
      body: {
        noteId: 'note-1',
        note: {
          note: 'Updated text',
          timelineId: '',
        },
      },
    });

    expect(result.output).toEqual({
      success: true,
      note_id: 'note-1',
      message: 'Successfully updated note note-1',
    });
  });

  it('persists only status (not the raw body/headers) when callKibanaApi throws on a non-2xx', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 500,
        headers: { 'x-leaky-header': 'header-value' },
        body: { sensitive: 'partial-success-payload' },
        message: 'HTTP 500: failed to update note',
      })
    );

    const error = await updateNoteStepDefinition
      .handler(mockContext)
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    const serialized = (error as ExecutionError).toSerializableObject();
    expect(serialized.type).toBe('ApiError');
    expect(serialized.details).toEqual({ status: 500 });
    expect(JSON.stringify(serialized.details)).not.toContain('partial-success-payload');
    expect(JSON.stringify(serialized.details)).not.toContain('x-leaky-header');
  });

  it('wraps generic errors in ExecutionError', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(new Error('Network error'));

    await expect(updateNoteStepDefinition.handler(mockContext)).rejects.toMatchObject({
      type: 'ApiError',
      message: 'Network error',
    });
  });
});
