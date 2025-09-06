/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Matcher } from '../../../constants';

export const buildMatcherScript = (matcher?: Matcher): estypes.Script => {
  if (!matcher || matcher.fields.length === 0 || matcher.values.length === 0) {
    throw new Error('Invalid matcher: fields and values must be defined and non-empty');
  }

  return {
    lang: 'painless',
    params: {
      matcher_fields: matcher.fields,
      matcher_values: matcher.values,
    },
    source: `
      for (def f : params.matcher_fields) {
        if (doc.containsKey(f) && !doc[f].empty) {
          for (def v : doc[f]) {
            if (params.matcher_values.contains(v)) return true;
          }
        }
      }
      return false;
    `,
  };
};

export const buildPrivilegedSearchBody = (
  script: estypes.Script,
  timeGte: string = 'now-10y'
): Omit<estypes.SearchRequest, 'index'> => ({
  size: 0,
  query: {
    bool: {
      must: [{ range: { '@timestamp': { gte: timeGte } } }, { script: { script } }],
    },
  },
  aggs: {
    privileged_user_status_since_last_run: {
      composite: {
        size: 1000,
        sources: [{ username: { terms: { field: 'user.name' } } }],
      },
      aggs: {
        latest_doc_for_user: {
          top_hits: {
            size: 1,
            sort: [{ '@timestamp': { order: 'desc' as estypes.SortOrder } }],
            script_fields: { is_privileged: { script } },
          },
        },
      },
    },
  },
});
