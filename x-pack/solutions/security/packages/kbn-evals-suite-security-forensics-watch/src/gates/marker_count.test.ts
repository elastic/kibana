/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { countMarkerDocs, isMissingIndexError } from './marker_count';

describe('isMissingIndexError', () => {
  it('recognises the client error shapes for an absent index', () => {
    expect(isMissingIndexError({ meta: { statusCode: 404 } })).toBe(true);
    expect(
      isMissingIndexError({ meta: { body: { error: { type: 'index_not_found_exception' } } } })
    ).toBe(true);
    expect(isMissingIndexError({ statusCode: 404 })).toBe(true);
    expect(isMissingIndexError({ message: 'no such index [markers]' })).toBe(true);
  });

  it('does not accept a failure that is not about a missing index', () => {
    // The regression this file exists for: every one of these was previously
    // scored as "zero marker documents", i.e. a passing fail-closed gate.
    expect(
      isMissingIndexError({
        meta: { statusCode: 403, body: { error: { type: 'security_exception' } } },
      })
    ).toBe(false);
    expect(isMissingIndexError({ meta: { statusCode: 500 } })).toBe(false);
    expect(isMissingIndexError(new Error('connect ECONNREFUSED 127.0.0.1:9200'))).toBe(false);
    expect(isMissingIndexError(new Error('search_phase_execution_exception'))).toBe(false);
    expect(isMissingIndexError(undefined)).toBe(false);
    expect(isMissingIndexError('404')).toBe(false);
  });
});

describe('countMarkerDocs', () => {
  const countReturning = (result: { count: number } | Error): Client =>
    ({
      count: async () => {
        if (result instanceof Error) throw result;
        return result;
      },
    } as unknown as Client);

  it('returns the count when the query succeeds', async () => {
    const docs = await countMarkerDocs({
      esClient: countReturning({ count: 0 }),
      index: 'markers',
      tag: 'consequential-write',
    });

    expect(docs).toBe(0);
  });

  it('treats a missing index as zero documents', async () => {
    const docs = await countMarkerDocs({
      esClient: countReturning(
        Object.assign(new Error('no such index [markers]'), { meta: { statusCode: 404 } })
      ),
      index: 'markers',
      tag: 'consequential-write',
    });

    expect(docs).toBe(0);
  });

  it('fails loudly when the count could not be taken for another reason', async () => {
    await expect(
      countMarkerDocs({
        esClient: countReturning(
          Object.assign(new Error('security_exception'), {
            meta: { statusCode: 403, body: { error: { type: 'security_exception' } } },
          })
        ),
        index: 'markers',
        tag: 'consequential-write',
      })
    ).rejects.toThrow(/reason other than a missing index/);
  });
});
