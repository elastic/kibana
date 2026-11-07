/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHuntStreamState, reduceHuntStreamEvent } from './hunt_stream_state';

describe('reduceHuntStreamEvent', () => {
  it('appends valid message chunk deltas', () => {
    const first = reduceHuntStreamEvent(createHuntStreamState(), {
      type: 'message_chunk',
      data: { message_id: 'message-1', text_chunk: 'Hello ' },
    });
    const second = reduceHuntStreamEvent(first, {
      type: 'message_chunk',
      data: { message_id: 'message-1', text_chunk: 'world' },
    });

    expect(second.message).toBe('Hello world');
  });

  it('ignores unknown and malformed payloads', () => {
    const state = createHuntStreamState();
    const malformed = reduceHuntStreamEvent(state, {
      type: 'message_chunk',
      data: { message_id: 'message-1' },
    });
    const incorrectlyNested = reduceHuntStreamEvent(malformed, {
      type: 'message_chunk',
      data: { data: { message_id: 'message-1', text_chunk: 'must not render' } },
    });
    const unknown = reduceHuntStreamEvent(incorrectlyNested, {
      type: 'future_event',
      data: { text_chunk: 'must not render' },
    });

    expect(unknown).toBe(state);
    expect(unknown.message).toBe('');
  });

  it('uses message_complete as the final value without duplicating chunks', () => {
    const partial = reduceHuntStreamEvent(createHuntStreamState(), {
      type: 'message_chunk',
      data: { message_id: 'message-1', text_chunk: 'Complete response' },
    });
    const complete = reduceHuntStreamEvent(partial, {
      type: 'message_complete',
      data: { message_id: 'message-1', message_content: 'Complete response' },
    });

    expect(complete.message).toBe('Complete response');
  });

  it('tracks tool progress without changing response text', () => {
    const partial = reduceHuntStreamEvent(createHuntStreamState(), {
      type: 'message_chunk',
      data: { message_id: 'message-1', text_chunk: 'Partial response' },
    });
    const withTool = reduceHuntStreamEvent(partial, {
      type: 'tool_call',
      data: {
        tool_call_id: 'call-1',
        tool_id: 'security.alerts',
        params: { query: 'high severity alerts' },
      },
    });
    const progressed = reduceHuntStreamEvent(withTool, {
      type: 'tool_progress',
      data: { tool_call_id: 'call-1', message: 'Searching alerts' },
    });

    expect(progressed.message).toBe('Partial response');
    expect(progressed.activities).toEqual([
      {
        id: 'call-1',
        toolId: 'security.alerts',
        status: 'running',
        detail: 'Searching alerts',
      },
    ]);
  });

  it('retains valid partial text when no completion event arrives', () => {
    const partial = reduceHuntStreamEvent(createHuntStreamState(), {
      type: 'message_chunk',
      data: { message_id: 'message-1', text_chunk: 'Useful partial finding' },
    });

    expect(partial.message).toBe('Useful partial finding');
  });

  it('completes immediately after the final message and tool result', () => {
    const withTool = reduceHuntStreamEvent(createHuntStreamState(), {
      type: 'tool_call',
      data: {
        tool_call_id: 'call-1',
        tool_id: 'platform.core.execute_esql',
        params: {},
      },
    });
    const withMessage = reduceHuntStreamEvent(withTool, {
      type: 'message_complete',
      data: { message_id: 'message-1', message_content: 'Investigation complete' },
    });
    const completed = reduceHuntStreamEvent(withMessage, {
      type: 'tool_result',
      data: {
        tool_call_id: 'call-1',
        tool_id: 'platform.core.execute_esql',
        results: [],
      },
    });

    expect(withMessage.status).toBe('running');
    expect(completed.status).toBe('completed');
  });
});
