/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_TRACE_SOURCE_FIELDS,
  buildAgentInventoryQuery,
  buildAgentTraceQuery,
} from './queries';

it('scopes requests to exactly one space and counts only agent execution spans', () => {
  const query = buildAgentInventoryQuery('marketing', []);
  expect(query.params.index).toBe('traces-agent_builder.otel-marketing');
  expect(query.params.query).toEqual({
    bool: {
      filter: expect.arrayContaining([
        { term: { 'attributes.elastic.inference.span.kind': 'AGENT' } },
        { term: { 'attributes.gen_ai.operation.name': 'invoke_agent' } },
      ]),
    },
  });
});

it('requests metadata only, excluding prompts, tool arguments, results and wildcard fields', () => {
  expect(
    AGENT_TRACE_SOURCE_FIELDS.some((field) =>
      /messages|instructions|arguments|result|\*/.test(field)
    )
  ).toBe(false);
  expect(buildAgentTraceQuery('default', ['trace-1']).params._source).toBe(
    AGENT_TRACE_SOURCE_FIELDS
  );
});

it('includes content join identifiers while leaving prompt and tool content out of trace searches', () => {
  expect(AGENT_TRACE_SOURCE_FIELDS).toEqual(
    expect.arrayContaining(['attributes.gen_ai.conversation.id', 'attributes.gen_ai.tool.call.id'])
  );
});
