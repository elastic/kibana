/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { ENTITY_FIELDS } from '../entities_table/constants';

export const buildResolutionFilter = (targetEntityId: string) => ({
  bool: {
    should: [
      { term: { [ENTITY_FIELDS.ENTITY_ID]: targetEntityId } },
      { term: { [ENTITY_FIELDS.RESOLVED_TO]: targetEntityId } },
    ],
    minimum_should_match: 1,
  },
});

export const getResolutionTargetId = (filters: Filter[]): string | undefined => {
  for (const f of filters) {
    if (f?.meta?.key === ENTITY_FIELDS.RESOLVED_TO && f?.query?.match_phrase) {
      const mp = f.query.match_phrase as Record<string, string | { query: string }>;
      const val = mp[ENTITY_FIELDS.RESOLVED_TO];
      if (val) return typeof val === 'string' ? val : val.query;
    }
  }
};
