/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Row } from '../common';
import { ESQL_MAX_QUERY_LENGTH, ID_LIST_CHUNK_SIZE, fetchPerIdChunk } from './esql';

const ids = (count: number): string[] => Array.from({ length: count }, (_, i) => `id-${i}`);

const buildQuery =
  (fixedLength = 0) =>
  (chunk: readonly string[]): string[] =>
    ['FROM index', `| WHERE ${'x'.repeat(fixedLength)}`, `| WHERE id IN (${chunk.join(', ')})`];

/** The ids each query was given. */
const recordChunks = () => {
  const chunks: number[] = [];
  const runQuery = jest.fn(async (steps: readonly string[]): Promise<Row[]> => {
    chunks.push(steps[2].split(',').length);
    return [];
  });
  return { runQuery, chunks };
};

describe('fetchPerIdChunk', () => {
  it('lists up to ID_LIST_CHUNK_SIZE ids in a query', async () => {
    const { runQuery, chunks } = recordChunks();
    await fetchPerIdChunk(runQuery, ids(ID_LIST_CHUNK_SIZE + 5), buildQuery());

    expect(chunks).toEqual([ID_LIST_CHUNK_SIZE, 5]);
  });

  it('lists fewer ids when the rest of the query already takes up the room', async () => {
    const { runQuery, chunks } = recordChunks();
    // Room for 500 ids of 100 characters beside the rest of the query.
    await fetchPerIdChunk(runQuery, ids(1_200), buildQuery(ESQL_MAX_QUERY_LENGTH - 50_000));

    expect(Math.max(...chunks)).toBeLessThanOrEqual(500);
    expect(chunks.reduce((sum, count) => sum + count, 0)).toBe(1_200);
  });

  it('fails when the rest of the query leaves no room for an id', async () => {
    const { runQuery } = recordChunks();

    await expect(
      fetchPerIdChunk(runQuery, ids(3), buildQuery(ESQL_MAX_QUERY_LENGTH))
    ).rejects.toThrow('too long');
    expect(runQuery).not.toHaveBeenCalled();
  });
});
