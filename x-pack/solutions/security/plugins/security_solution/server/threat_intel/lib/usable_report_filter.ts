/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * Two bars for threat reports.
 *
 * Hunt-usable: supply finished the report. `lineage.extraction_method` is present
 * and not `pending` (enrich still owes work), with title or body text and
 * `severity.level`. It is a denylist on `pending`, so `workflow_v2`, `kev`,
 * `text_indicator_list`, `seeded` and any future adapter value count; a missing
 * `extraction_method` does not.
 *
 * Indicator-eligible: at least one nested IOC. Find and readiness AND it with
 * hunt-usable; promote keeps its own IOC-only filter. KEV reports are hunt-usable
 * but not indicator-eligible.
 *
 * Future work: a CVE-to-environment vuln hunt. The Intelligence Hub does not
 * consume these bars.
 */

/**
 * Hunt-usable bar: supply finished the report (`lineage.extraction_method` is
 * present and not `pending`), plus title or body text and severity.level.
 * Denylist on `pending`, so `seeded` and any future adapter value count as finished.
 */
export const HUNT_USABLE_FILTER: estypes.QueryDslQueryContainer = {
  bool: {
    filter: [
      { exists: { field: 'lineage.extraction_method' } },
      {
        bool: {
          should: [
            { exists: { field: 'content.title' } },
            { exists: { field: 'content.body_text' } },
          ],
          minimum_should_match: 1,
        },
      },
      { exists: { field: 'severity.level' } },
    ],
    must_not: [{ term: { 'lineage.extraction_method': 'pending' } }],
  },
};

/**
 * Indicator-eligible bar: at least one nested IOC. Callers AND this with
 * `HUNT_USABLE_FILTER`. `extracted.iocs` is nested, so exists on the parent
 * path matches nothing.
 */
export const INDICATOR_ELIGIBLE_FILTER: estypes.QueryDslQueryContainer = {
  nested: {
    path: 'extracted.iocs',
    query: {
      exists: { field: 'extracted.iocs.value' },
    },
  },
};
