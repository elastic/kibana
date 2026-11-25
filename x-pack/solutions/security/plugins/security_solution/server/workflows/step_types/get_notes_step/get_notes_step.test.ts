/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { getNotesStepDefinition } from './get_notes_step';
import { NOTE_URL } from '../../../../common/constants';
import type { getNotesInputSchema } from '../../../../common/workflows/step_types/get_notes_step/get_notes_step_common';

describe('getNotesStepDefinition', () => {
  let mockContextManager: jest.Mocked<
    StepHandlerContext<typeof getNotesInputSchema>['contextManager']
  >;
  let mockContext: StepHandlerContext<typeof getNotesInputSchema>;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<StepHandlerContext<typeof getNotesInputSchema>['contextManager']>;

    mockContext = {
      input: {
        document_id: 'alert-1',
      },
      contextManager: mockContextManager,
    } as unknown as StepHandlerContext<typeof getNotesInputSchema>;
  });

  it('retrieves and maps the notes for a document', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: {
        totalCount: 1,
        notes: [
          {
            noteId: 'note-1',
            note: 'A note',
            eventId: 'alert-1',
            timelineId: '',
            createdBy: 'elastic',
            created: 1700000000000,
            updatedBy: 'elastic',
            updated: 1700000000001,
            version: 'WzEsMV0=',
          },
        ],
      },
    });

    const result = await getNotesStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: NOTE_URL,
      query: { documentIds: 'alert-1' },
    });

    expect(result.output).toEqual({
      success: true,
      total_count: 1,
      notes: [
        {
          note_id: 'note-1',
          text: 'A note',
          document_id: 'alert-1',
          timeline_id: '',
          created_by: 'elastic',
          created: 1700000000000,
          updated_by: 'elastic',
          updated: 1700000000001,
          version: 'WzEsMV0=',
        },
      ],
    });
  });

  it('returns an empty list when there are no notes', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { totalCount: 0, notes: [] },
    });

    const result = await getNotesStepDefinition.handler(mockContext);

    expect(result.output).toEqual({
      success: true,
      total_count: 0,
      notes: [],
    });
  });

  it('persists only status (not the raw body/headers) when callKibanaApi throws on a non-2xx', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 500,
        headers: { 'x-leaky-header': 'header-value' },
        body: { sensitive: 'partial-success-payload' },
        message: 'HTTP 500: failed to get notes',
      })
    );

    const error = await getNotesStepDefinition
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

    await expect(getNotesStepDefinition.handler(mockContext)).rejects.toMatchObject({
      type: 'ApiError',
      message: 'Network error',
    });
  });
});
