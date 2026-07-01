/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH } from './response_actions.mock';
import { RuleResponseAction } from './response_actions.gen';

const { readFileSync } = jest.requireActual<{
  readFileSync(path: string, encoding: 'utf8'): string;
}>('fs');

const responseActionsGenSource = readFileSync(require.resolve('./response_actions.gen.ts'), 'utf8');

const ECS_MAPPING_SCHEMA_BLOCK = /export const EcsMapping = lazySchema\(\(\) =>[\s\S]*?\n\);/;

const getZodArrayExpressionsWithoutMax = (source: string): string[] => {
  const expressions: string[] = [];
  const arrayCallPattern = /\bz\.array\(/g;

  for (const match of source.matchAll(arrayCallPattern)) {
    let cursor = match.index + match[0].length;
    let depth = 1;

    while (cursor < source.length && depth > 0) {
      if (source[cursor] === '(') {
        depth += 1;
      } else if (source[cursor] === ')') {
        depth -= 1;
      }
      cursor += 1;
    }

    const chain = source.slice(cursor).match(/^(?:\.\w+\([^;\n]*?\))*/)?.[0] ?? '';
    const expression = source.slice(match.index, cursor + chain.length);

    if (!chain.includes('.max(')) {
      expressions.push(expression);
    }
  }

  return expressions;
};

describe('response action generated schema bounds', () => {
  test('keeps generated response action strings and arrays bounded outside documented residuals', () => {
    const sourceWithoutEcsMapping = responseActionsGenSource.replace(ECS_MAPPING_SCHEMA_BLOCK, '');

    expect(sourceWithoutEcsMapping).not.toMatch(/\bz\.string\(\)(?!\.max)/);
    expect(getZodArrayExpressionsWithoutMax(sourceWithoutEcsMapping)).toEqual([]);

    expect(responseActionsGenSource).toMatch(/query: z\.string\(\)\.max\(10000\)/);
    expect(responseActionsGenSource).toMatch(/queries: z\.array\(OsqueryQuery\)\.max\(100\)/);
    expect(responseActionsGenSource).toMatch(/packId: z\.string\(\)\.max\(256\)/);
    expect(responseActionsGenSource).toMatch(/savedQueryId: z\.string\(\)\.max\(256\)/);
    expect(responseActionsGenSource).toMatch(/scriptInput: z\.string\(\)\.max\(8192\)/);
    expect(responseActionsGenSource).toMatch(/field: z\.string\(\)\.max\(1024\)/);
  });

  test('documents EcsMapping map keys and key count as the only accepted residual', () => {
    const ecsMappingBlock = responseActionsGenSource.match(ECS_MAPPING_SCHEMA_BLOCK)?.[0];

    expect(ecsMappingBlock).toBeDefined();
    expect(ecsMappingBlock).toContain('z.object({}).catchall(');
    expect(ecsMappingBlock).toMatch(/field: z\.string\(\)\.max\(1024\)/);
    expect(ecsMappingBlock).toMatch(
      /value: z\.union\(\[z\.string\(\)\.max\(1024\), z\.array\(z\.string\(\)\.max\(1024\)\)\.max\(100\)\]\)/
    );
    expect(ecsMappingBlock).not.toMatch(/maxProperties|z\.record\(/);
  });

  test('rejects over-limit camelCase osquery response action queries', () => {
    const result = RuleResponseAction.safeParse({
      actionTypeId: '.osquery',
      params: {
        query: 'select * from processes;'.padEnd(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH + 1, 'a'),
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(stringifyZodError(result.error)).toContain(
        String(OSQUERY_RESPONSE_ACTION_QUERY_MAX_LENGTH)
      );
    }
  });
});
