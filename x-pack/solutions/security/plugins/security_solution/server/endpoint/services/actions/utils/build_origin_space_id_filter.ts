/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * Space filter for the response action request index. Saved objects do not fan out, so only a
 * document field can scope a cross-project read.
 *
 * Matching field-less documents in the default space mirrors what `fetch_action_requests.ts` does when
 * it maps the hit. `matchMissingOriginSpaceId: false` drops that, since once a read fans out another
 * project's field-less document may belong to a named space over there.
 */
export const buildOriginSpaceIdFilter = (
  spaceId: string,
  { matchMissingOriginSpaceId = true }: { matchMissingOriginSpaceId?: boolean } = {}
): estypes.QueryDslQueryContainer => {
  if (spaceId !== DEFAULT_SPACE_ID || !matchMissingOriginSpaceId) {
    return { term: { originSpaceId: spaceId } };
  }

  return {
    bool: {
      should: [
        { term: { originSpaceId: DEFAULT_SPACE_ID } },
        { bool: { must_not: { exists: { field: 'originSpaceId' } } } },
      ],
      minimum_should_match: 1,
    },
  };
};
