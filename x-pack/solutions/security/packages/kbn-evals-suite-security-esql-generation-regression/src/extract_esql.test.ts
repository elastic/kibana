/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { extractEsqlFromConverseResponse } from './extract_esql';

describe('extractEsqlFromConverseResponse', () => {
  it('returns the query from a generate_esql tool call result', () => {
    const out = {
      steps: [
        {
          type: 'tool_call',
          tool_id: platformCoreTools.generateEsql,
          results: [
            {
              type: 'query',
              data: { esql: 'FROM logs-*\n| LIMIT 10' },
            },
          ],
        },
      ],
      messages: [{ message: 'Here is the query.' }],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe('FROM logs-*\n| LIMIT 10');
  });

  it('falls back to execute_esql when generate_esql is absent', () => {
    const out = {
      steps: [
        {
          type: 'tool_call',
          tool_id: platformCoreTools.executeEsql,
          results: [
            {
              type: 'esql_results',
              data: { query: 'FROM packetbeat-*\n| LIMIT 5', values: [] },
            },
          ],
        },
      ],
      messages: [],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe('FROM packetbeat-*\n| LIMIT 5');
  });

  it('prefers the generate_esql tool call when both are present', () => {
    const out = {
      steps: [
        {
          type: 'tool_call',
          tool_id: platformCoreTools.generateEsql,
          results: [{ type: 'query', data: { esql: 'GENERATED' } }],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.executeEsql,
          results: [{ type: 'esql_results', data: { query: 'EXECUTED' } }],
        },
      ],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe('GENERATED');
  });

  it('skips tool_call steps with non-matching tool_id', () => {
    const out = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.list_indices',
          results: [{ type: 'index_listing', data: { indices: ['logs-*'] } }],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.generateEsql,
          results: [{ type: 'query', data: { esql: 'FROM logs-*' } }],
        },
      ],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe('FROM logs-*');
  });

  it('extracts a fenced ```esql code block from the final message when no tool result is present', () => {
    const out = {
      steps: [],
      messages: [
        {
          message:
            'Here you go:\n\n```esql\nFROM logs-*\n| WHERE @timestamp >= NOW() - 1h\n```\n\nLet me know if you need adjustments.',
        },
      ],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe(
      'FROM logs-*\n| WHERE @timestamp >= NOW() - 1h'
    );
  });

  it('extracts a fenced code block without a language tag', () => {
    const out = {
      steps: [],
      messages: [
        {
          message: '```\nFROM nyc_taxis-*\n| LIMIT 1\n```',
        },
      ],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe('FROM nyc_taxis-*\n| LIMIT 1');
  });

  it('falls back to slicing from the FROM keyword when no fence is present', () => {
    const out = {
      steps: [],
      messages: [{ message: "Sure, here's the query: FROM employees-*\n| LIMIT 5" }],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe('FROM employees-*\n| LIMIT 5');
  });

  it('returns an empty string when no extraction strategy matches', () => {
    expect(
      extractEsqlFromConverseResponse({
        steps: [],
        messages: [{ message: 'Pagination is not supported in ES|QL.' }],
      })
    ).toBe('');
  });

  it('returns an empty string for an empty response', () => {
    expect(extractEsqlFromConverseResponse({})).toBe('');
  });

  it('ignores malformed tool results (non-array, missing data)', () => {
    const out = {
      steps: [
        {
          type: 'tool_call',
          tool_id: platformCoreTools.generateEsql,
          results: 'not an array' as unknown as unknown[],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.generateEsql,
          results: [{ type: 'query', data: { esql: 'FROM logs-*' } }],
        },
      ],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe('FROM logs-*');
  });
});
