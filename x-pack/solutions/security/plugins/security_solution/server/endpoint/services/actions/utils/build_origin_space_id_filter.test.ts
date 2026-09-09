/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { buildOriginSpaceIdFilter } from './build_origin_space_id_filter';

describe('buildOriginSpaceIdFilter()', () => {
  it('should also match documents with no originSpaceId in the default space by default', () => {
    expect(buildOriginSpaceIdFilter(DEFAULT_SPACE_ID)).toEqual({
      bool: {
        should: [
          { term: { originSpaceId: DEFAULT_SPACE_ID } },
          { bool: { must_not: { exists: { field: 'originSpaceId' } } } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('should drop the missing-field allowance in the default space when asked to', () => {
    expect(
      buildOriginSpaceIdFilter(DEFAULT_SPACE_ID, { matchMissingOriginSpaceId: false })
    ).toEqual({ term: { originSpaceId: DEFAULT_SPACE_ID } });
  });

  it('should match a named space exactly', () => {
    expect(buildOriginSpaceIdFilter('foo')).toEqual({ term: { originSpaceId: 'foo' } });
  });

  it('should never include field-less documents for a named space, whatever the option says', () => {
    expect(buildOriginSpaceIdFilter('foo', { matchMissingOriginSpaceId: true })).toEqual({
      term: { originSpaceId: 'foo' },
    });
  });
});
