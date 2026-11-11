/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { deleteNoteStepDefinition } from './delete_note_step';
import { NOTE_URL } from '../../../../common/constants';
import type { deleteNoteInputSchema } from '../../../../common/workflows/step_types/delete_note_step/delete_note_step_common';

describe('deleteNoteStepDefinition', () => {
  let mockContextManager: jest.Mocked<
    StepHandlerContext<typeof deleteNoteInputSchema>['contextManager']
  >;
  let mockContext: StepHandlerContext<typeof deleteNoteInputSchema>;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<StepHandlerContext<typeof deleteNoteInputSchema>['contextManager']>;

    mockContext = {
      input: {
        ids: 'note-1',
      },
      contextManager: mockContextManager,
    } as unknown as StepHandlerContext<typeof deleteNoteInputSchema>;
  });

  it('deletes a single note', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: {},
    });

    const result = await deleteNoteStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'DELETE',
      path: NOTE_URL,
      body: { noteIds: ['note-1'] },
    });

    expect(result.output).toEqual({
      success: true,
      message: 'Successfully deleted 1 note(s)',
    });
  });

  it('deletes multiple notes', async () => {
    mockContext.input = { ids: ['note-1', 'note-2'] };

    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: {},
    });

    const result = await deleteNoteStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'DELETE',
      path: NOTE_URL,
      body: { noteIds: ['note-1', 'note-2'] },
    });

    expect(result.output).toEqual({
      success: true,
      message: 'Successfully deleted 2 note(s)',
    });
  });

  it('persists only status (not the raw body/headers) when callKibanaApi throws on a non-2xx', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 500,
        headers: { 'x-leaky-header': 'header-value' },
        body: { sensitive: 'partial-success-payload' },
        message: 'HTTP 500: failed to delete note',
      })
    );

    const error = await deleteNoteStepDefinition
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

    await expect(deleteNoteStepDefinition.handler(mockContext)).rejects.toMatchObject({
      type: 'ApiError',
      message: 'Network error',
    });
  });
});
