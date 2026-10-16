/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedRepository } from '../models/repository_codec';
import type { SourceReader } from '../ports/source_reader';
import { buildBlockCommentIndex } from './block_comment_index';

/** Provides one immutable repository identity for lexical-index tests. */
const repository: ResolvedRepository = {
  commitSha: '0123456789012345678901234567890123456789',
  repository: 'elastic/example',
  requestedRevision: 'main',
};

/** Verifies candidate-path lexical indexing bounds source requests without dropping any path state. */
describe('buildBlockCommentIndex', () => {
  it('bounds lexical path greps and retains every candidate path transition', async () => {
    /** Holds local test or extraction state. */
    const paths: readonly string[] = Array.from({ length: 20 }, (_, index) => `src/${index}.ts`);
    /** Tracks in-flight lexical grep requests. */
    let activeGreps: number = 0;
    /** Retains the greatest observed lexical grep concurrency. */
    let maximumActiveGreps: number = 0;
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ path }) => {
        activeGreps += 1;
        maximumActiveGreps = Math.max(maximumActiveGreps, activeGreps);
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        activeGreps -= 1;
        return {
          items: [{ line: 1, path: path ?? 'src/unexpected.ts', text: '/* disabled' }],
          status: 'complete',
        };
      },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    /** Holds local test or extraction state. */
    const result = await buildBlockCommentIndex({ paths, reader, repository });
    expect(maximumActiveGreps).toBeGreaterThan(1);
    expect(maximumActiveGreps).toBeLessThanOrEqual(8);
    expect(paths.every((path) => result.index.stateAtLine(path, 2).inBlockComment)).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });
});
