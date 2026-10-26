/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { createNoteStepDefinition } from './create_note_step';
import { NOTE_URL } from '../../../../common/constants';
import type { createNoteInputSchema } from '../../../../common/workflows/step_types/create_note_step/create_note_step_common';

describe('createNoteStepDefinition', () => {
  let mockContextManager: jest.Mocked<
    StepHandlerContext<typeof createNoteInputSchema>['contextManager']
  >;
  let mockContext: StepHandlerContext<typeof createNoteInputSchema>;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<StepHandlerContext<typeof createNoteInputSchema>['contextManager']>;

    mockContext = {
      input: {
        text: 'A note',
        document_id: 'alert-1',
      },
      contextManager: mockContextManager,
    } as unknown as StepHandlerContext<typeof createNoteInputSchema>;
  });

  it('creates a note linked to a document and returns the new note id', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { note: { noteId: 'note-123' } },
    });

    const result = await createNoteStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'PATCH',
      path: NOTE_URL,
      body: {
        note: {
          note: 'A note',
          eventId: 'alert-1',
          timelineId: '',
        },
      },
    });

    expect(result.output).toEqual({
      success: true,
      note_id: 'note-123',
      message: 'Successfully created note note-123',
    });
  });

  it('works when the response does not include a note id', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: {},
    });

    const result = await createNoteStepDefinition.handler(mockContext);

    expect(result.output).toEqual({
      success: true,
      note_id: undefined,
      message: 'Successfully created note',
    });
  });

  it('persists only status (not the raw body/headers) when callKibanaApi throws on a non-2xx', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 500,
        headers: { 'x-leaky-header': 'header-value' },
        body: { sensitive: 'partial-success-payload' },
        message: 'HTTP 500: failed to persist note',
      })
    );

    const error = await createNoteStepDefinition
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

    await expect(createNoteStepDefinition.handler(mockContext)).rejects.toMatchObject({
      type: 'ApiError',
      message: 'Network error',
    });
  });
});
