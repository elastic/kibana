/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * Usable bar: title or body text, nested IOCs, and severity.level.
 * `extracted.iocs` is nested, so exists on the parent path matches nothing.
 */
export const USABLE_REPORT_FILTER: estypes.QueryDslQueryContainer = {
  bool: {
    filter: [
      {
        bool: {
          should: [
            { exists: { field: 'content.title' } },
            { exists: { field: 'content.body_text' } },
          ],
          minimum_should_match: 1,
        },
      },
      {
        nested: {
          path: 'extracted.iocs',
          query: {
            exists: { field: 'extracted.iocs.value' },
          },
        },
      },
      { exists: { field: 'severity.level' } },
    ],
  },
};
