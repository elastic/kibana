/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetTraceResponse } from '@kbn/evals-common';
import { summarizeTraceSpans } from './summarize_trace_spans';

const SUBJECT = 'openai-gpt-oss-120b';
const HELPER = 'google-gemini-3.5-flash-lite';

const BASE_TIME = Date.parse('2026-09-05T19:30:58.391Z');

const span = (
  name: string,
  id: string,
  startOffsetMs: number,
  attributes: Record<string, unknown> = {}
) => ({
  name,
  span_id: id,
  parent_span_id: 'root',
  start_time: new Date(BASE_TIME + startOffsetMs).toISOString(),
  duration_ms: 10,
  attributes,
});

const output = (finishReason: string, parts: unknown[]) => ({
  'gen_ai.output.messages': JSON.stringify([
    { role: 'assistant', finish_reason: finishReason, parts },
  ]),
});

const text = (content: string) => ({ type: 'text', content });
const toolCall = { type: 'tool_call', id: 'call-1', name: 'platform.core.search', arguments: {} };

const trace = (spans: ReturnType<typeof span>[]): GetTraceResponse =>
  ({
    trace_id: 't',
    total_spans: spans.length,
    duration_ms: 100,
    spans: [
      { ...span('invoke_agent Elastic AI Agent', 'root', 0), parent_span_id: undefined },
      ...spans,
    ],
  } as unknown as GetTraceResponse);

describe('summarizeTraceSpans answer extraction', () => {
  it('picks the subject stop span over a later helper stop span', () => {
    const summary = summarizeTraceSpans(
      trace([
        span(`chat ${SUBJECT}`, 'a', 10, output('tool_calls', [toolCall])),
        span(`chat ${SUBJECT}`, 'b', 20, output('stop', [text('the real answer')])),
        span(`chat ${HELPER}`, 'c', 30, output('stop', [text('{"title":"helper"}')])),
      ]),
      SUBJECT
    );
    expect(summary?.answer).toBe('the real answer');
    expect(summary?.subjectChatSpans).toBe(2);
  });

  it('takes the last subject stop span by start time regardless of array order', () => {
    const summary = summarizeTraceSpans(
      trace([
        span(`chat ${SUBJECT}`, 'late', 50, output('stop', [text('final')])),
        span(`chat ${SUBJECT}`, 'early', 10, output('stop', [text('draft')])),
      ]),
      SUBJECT
    );
    expect(summary?.answer).toBe('final');
  });

  it('leaves answer undefined when the subject only ended on tool calls', () => {
    const summary = summarizeTraceSpans(
      trace([span(`chat ${SUBJECT}`, 'a', 10, output('tool_calls', [toolCall]))]),
      SUBJECT
    );
    expect(summary?.answer).toBeUndefined();
    expect(summary?.subjectChatSpans).toBe(1);
  });

  it('keeps only the text parts of a mixed text + tool_call message', () => {
    const summary = summarizeTraceSpans(
      trace([
        span(
          `chat ${SUBJECT}`,
          'a',
          10,
          output('stop', [text('part one '), toolCall, text('part two')])
        ),
      ]),
      SUBJECT
    );
    expect(summary?.answer).toBe('part one part two');
  });

  it('leaves answer undefined for malformed output JSON without throwing', () => {
    const summary = summarizeTraceSpans(
      trace([
        span(`chat ${SUBJECT}`, 'a', 10, { 'gen_ai.output.messages': '[{"role":"assistant",' }),
        span(`chat ${SUBJECT}`, 'b', 20, { 'gen_ai.output.messages': '{"not":"an array"}' }),
        span(`chat ${SUBJECT}`, 'c', 30, { 'gen_ai.output.messages': 42 }),
      ]),
      SUBJECT
    );
    expect(summary?.answer).toBeUndefined();
  });

  it('does not fall back to helper or other-model spans when no span matches the subject', () => {
    const summary = summarizeTraceSpans(
      trace([span(`chat ${HELPER}`, 'a', 10, output('stop', [text('helper text')]))]),
      SUBJECT
    );
    expect(summary?.answer).toBeUndefined();
    expect(summary?.subjectChatSpans).toBe(0);
  });

  it('leaves answer undefined when no subject model id is supplied', () => {
    const summary = summarizeTraceSpans(
      trace([span(`chat ${SUBJECT}`, 'a', 10, output('stop', [text('text')]))])
    );
    expect(summary?.answer).toBeUndefined();
    expect(summary?.subjectChatSpans).toBeUndefined();
  });

  it('does not match a subject id that is only a prefix of the span model name', () => {
    const summary = summarizeTraceSpans(
      trace([span(`chat ${SUBJECT}-preview`, 'a', 10, output('stop', [text('other model')]))]),
      SUBJECT
    );
    expect(summary?.answer).toBeUndefined();
  });

  it.each([
    ['eis-openai-gpt-oss-120b', 'openai-gpt-oss-120b'],
    ['eis-anthropic-claude-4-6-opus', 'anthropic-claude-4.6-opus'],
    ['eis-google-gemini-3-1-pro', 'google-gemini-3.1-pro'],
    ['anthropic-claude-4.6-opus', 'anthropic-claude-4.6-opus'],
  ])('matches EIS-style subject id %s to span model %s', (subject, spanModel) => {
    const summary = summarizeTraceSpans(
      trace([span(`chat ${spanModel}`, 'a', 10, output('stop', [text('eis answer')]))]),
      subject
    );
    expect(summary?.answer).toBe('eis answer');
  });

  it('does not equate different models after normalization', () => {
    const summary = summarizeTraceSpans(
      trace([span('chat anthropic-claude-4.5-opus', 'a', 10, output('stop', [text('wrong')]))]),
      'eis-anthropic-claude-4-6-opus'
    );
    expect(summary?.answer).toBeUndefined();
    expect(summary?.subjectChatSpans).toBe(0);
  });
});
