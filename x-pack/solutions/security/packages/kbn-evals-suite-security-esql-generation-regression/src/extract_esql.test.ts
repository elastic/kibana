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

  // Regression for the weekly #79 extraction defect: the graded candidate
  // must be the query the agent DELIVERED, not an artifact it passed through
  // on the way there. Both fixtures are verbatim from golden build
  // 01a14b73-3b78-4ca6-b2c5-e5ce35986c37 (ex 0 / anthropic-claude-4.6-opus),
  // where the extractor graded the probe.
  const PROBE_QUERY = 'FROM postgres-logs* | KEEP message | LIMIT 10';
  const DELIVERED_QUERY =
    'FROM postgres-logs* | DISSECT message "%{} duration: %{query_duration} ms" | STATS avg_duration = AVG(query_duration_num)';

  it('grades the generated query, not an earlier execute_esql probe', () => {
    const out = {
      steps: [
        {
          type: 'tool_call',
          tool_id: platformCoreTools.listIndices,
          results: [{ type: 'index_listing', data: { indices: ['postgres-logs*'] } }],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.executeEsql,
          results: [{ type: 'esql_results', data: { query: PROBE_QUERY, values: [] } }],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.generateEsql,
          results: [{ type: 'query', data: { esql: DELIVERED_QUERY } }],
        },
      ],
      messages: [{ message: `Here is the query:\n\n\`\`\`esql\n${DELIVERED_QUERY}\n\`\`\`` }],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe(DELIVERED_QUERY);
  });

  it('returns the LAST generate_esql result when the agent supersedes an earlier one', () => {
    const out = {
      steps: [
        {
          type: 'tool_call',
          tool_id: platformCoreTools.generateEsql,
          results: [{ type: 'query', data: { esql: PROBE_QUERY } }],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.executeEsql,
          results: [{ type: 'esql_results', data: { query: PROBE_QUERY, values: [] } }],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.generateEsql,
          results: [{ type: 'query', data: { esql: DELIVERED_QUERY } }],
        },
      ],
      messages: [{ message: 'The refined query above is the final answer.' }],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe(DELIVERED_QUERY);
  });

  it('still falls back to the LAST execute_esql payload when no generate_esql ran', () => {
    const out = {
      steps: [
        {
          type: 'tool_call',
          tool_id: platformCoreTools.executeEsql,
          results: [{ type: 'esql_results', data: { query: PROBE_QUERY, values: [] } }],
        },
        {
          type: 'tool_call',
          tool_id: platformCoreTools.executeEsql,
          results: [{ type: 'esql_results', data: { query: DELIVERED_QUERY, values: [] } }],
        },
      ],
      messages: [],
    };

    expect(extractEsqlFromConverseResponse(out)).toBe(DELIVERED_QUERY);
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

  describe('SQL pre-check guard', () => {
    it('returns empty for raw SQL SELECT in the final message (FROM heuristic guard)', () => {
      const out = {
        steps: [],
        messages: [
          {
            message:
              'Here is your query: SELECT user.name, COUNT(*) FROM logs-* WHERE event.action = "login" GROUP BY user.name;',
          },
        ],
      };

      expect(extractEsqlFromConverseResponse(out)).toBe('');
    });

    it('returns empty for raw SQL with JOIN ... ON in the final message', () => {
      const out = {
        steps: [],
        messages: [
          {
            message:
              'Run: SELECT u.name FROM users u JOIN logs l ON u.id = l.user_id WHERE l.event = "fail"',
          },
        ],
      };

      expect(extractEsqlFromConverseResponse(out)).toBe('');
    });

    it('returns empty for raw SQL DDL/DML preceding a FROM keyword', () => {
      const ddlCases = [
        'ALTER TABLE foo ADD COLUMN bar TEXT; SELECT * FROM foo',
        'CREATE TABLE foo AS SELECT * FROM bar',
        'DELETE FROM logs-* WHERE @timestamp < NOW() - INTERVAL 1 DAY',
        'UPDATE users SET active = false FROM logs WHERE users.id = logs.user_id',
        'WITH cte AS (SELECT * FROM x) SELECT * FROM cte',
      ];
      for (const message of ddlCases) {
        const out = { steps: [], messages: [{ message }] };
        expect({ message, got: extractEsqlFromConverseResponse(out) }).toEqual({
          message,
          got: '',
        });
      }
    });

    it('returns empty for a fenced ```sql block (intentionally not treated as ES|QL)', () => {
      const out = {
        steps: [],
        messages: [
          {
            message: 'Here you go:\n```sql\nSELECT user.name FROM logs WHERE x = 1\n```',
          },
        ],
      };

      expect(extractEsqlFromConverseResponse(out)).toBe('');
    });

    it('returns empty for a fenced ```esql block whose contents are actually SQL', () => {
      const out = {
        steps: [],
        messages: [
          {
            message: '```esql\nSELECT user.name FROM logs WHERE x = 1\n```',
          },
        ],
      };

      expect(extractEsqlFromConverseResponse(out)).toBe('');
    });

    it('does NOT fall through to the FROM heuristic when a non-ES|QL fenced block was found', () => {
      // Even though the prose after the fence contains a valid-looking
      // `FROM logs-*`, once the model committed to a fenced block the
      // extractor sticks with that decision — trying to salvage from
      // the surrounding text would be lower-signal than scoring 0.
      const out = {
        steps: [],
        messages: [
          {
            message:
              '```sql\nSELECT * FROM users\n```\n\nAs ES|QL: FROM logs-* | WHERE x = 1 | LIMIT 10',
          },
        ],
      };

      expect(extractEsqlFromConverseResponse(out)).toBe('');
    });

    it('accepts a fenced block whose contents start with FROM (legitimate ES|QL)', () => {
      const out = {
        steps: [],
        messages: [
          {
            message: '```esql\nFROM logs-* | WHERE @timestamp >= ?_tstart | STATS COUNT(*)\n```',
          },
        ],
      };

      expect(extractEsqlFromConverseResponse(out)).toBe(
        'FROM logs-* | WHERE @timestamp >= ?_tstart | STATS COUNT(*)'
      );
    });

    it('accepts ES|QL starting with ROW or SHOW (alternate source commands)', () => {
      expect(
        extractEsqlFromConverseResponse({
          steps: [],
          messages: [{ message: '```esql\nROW a = 1, b = 2\n```' }],
        })
      ).toBe('ROW a = 1, b = 2');

      expect(
        extractEsqlFromConverseResponse({
          steps: [],
          messages: [{ message: '```\nSHOW INFO\n```' }],
        })
      ).toBe('SHOW INFO');
    });

    it('accepts the FROM heuristic when no SQL verb precedes the FROM', () => {
      const out = {
        steps: [],
        messages: [
          { message: 'Sure, here is the ES|QL query you asked for: FROM logs-* | LIMIT 10' },
        ],
      };

      expect(extractEsqlFromConverseResponse(out)).toBe('FROM logs-* | LIMIT 10');
    });

    it('accepts the FROM heuristic when the prose contains the English word "with"', () => {
      // Regression for Garrett Spong's review comment on PR #268787:
      // the SQL pre-check guard used to include a bare `\bWITH\b` in
      // the case-insensitive verb list, which silently refused every
      // legitimate ES|QL response whose surrounding prose contained
      // "with" — one of the most common English words in assistant
      // explanations ("the query with the filter applied").
      const proseWithCases = [
        "Sure, here's the query with the right filter applied: FROM logs-* | LIMIT 10",
        'Below is the ES|QL with no time bound: FROM events-* | STATS COUNT(*)',
        'Hello! Here is the query, with output grouped by host: FROM logs-* | STATS COUNT(*) BY host.name',
      ];
      for (const message of proseWithCases) {
        const result = extractEsqlFromConverseResponse({ steps: [], messages: [{ message }] });
        expect({ message, result }).toEqual({
          message,
          result: expect.stringMatching(/^FROM /),
        });
      }
    });

    it('refuses a FROM that is the English preposition inside prose', () => {
      // Verbatim from golden build 01a14b73-… (ex 24 / claude-4.6-sonnet),
      // where this slice reached the validity evaluator as
      // `from flagged processes. - **Convert to a detection rule?** …` and
      // failed to parse with `SyntaxError: mismatched input 'processes.'
      // expecting <EOF>`. All four quality evaluators read the same string,
      // so prose here reads as a wrong answer from the model.
      const proseCases = [
        'No ES|QL query fits this question, but the alert I summarised came from flagged processes. - **Convert to a detection rule?** This query is read-only and can be saved as a rule.',
        'The matching events come FROM /tmp directories. Ask again with an index pattern.',
      ];
      for (const message of proseCases) {
        expect({
          message,
          got: extractEsqlFromConverseResponse({ steps: [], messages: [{ message }] }),
        }).toEqual({
          message,
          got: '',
        });
      }
    });

    it('still accepts a pipe-free FROM over a valid index token (no over-tightening)', () => {
      const bareCases = [
        'FROM logs-*',
        'Sure — FROM nyc_taxis-* ',
        'Use FROM `logs-production.evaluations.2025.01.01`',
        'FROM logs-* METADATA _id',
      ];
      for (const message of bareCases) {
        const got = extractEsqlFromConverseResponse({ steps: [], messages: [{ message }] });
        expect({ message, got }).toEqual({ message, got: expect.stringMatching(/^FROM /) });
      }
    });

    it('still refuses SQL CTE shape `WITH foo AS (...)` (not English "with")', () => {
      // The dedicated CTE regex picks up the SQL `WITH <name> AS (`
      // structure without colliding with bare English "with".
      const cteCases = [
        'WITH cte AS (SELECT * FROM x) SELECT * FROM cte',
        'with my_cte as (select id from users) select * from my_cte',
        'WITH a AS (SELECT 1), b AS (SELECT 2) SELECT * FROM a, b',
      ];
      for (const message of cteCases) {
        const out = { steps: [], messages: [{ message }] };
        expect({ message, got: extractEsqlFromConverseResponse(out) }).toEqual({
          message,
          got: '',
        });
      }
    });

    it('does NOT apply the guard to tool-call results (trusted contract)', () => {
      // The `generate_esql` / `execute_esql` tools are contracted to emit
      // ES|QL; if a tool's data field contains something unusual, we
      // pass it through and let the validity evaluator be the judge.
      // This protects legitimate edge cases (leading comments, unusual
      // whitespace, agent-internal annotations) from being filtered out
      // before reaching the parser.
      const oddButTrusted =
        '// Generated for question Q42\nFROM logs-* | WHERE event.action == "login"';
      const out = {
        steps: [
          {
            type: 'tool_call',
            tool_id: platformCoreTools.generateEsql,
            results: [{ type: 'query', data: { esql: oddButTrusted } }],
          },
        ],
        messages: [],
      };

      expect(extractEsqlFromConverseResponse(out)).toBe(oddButTrusted);
    });
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
