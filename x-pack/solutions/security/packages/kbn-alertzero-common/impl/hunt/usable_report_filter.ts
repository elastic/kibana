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
 * `severity.level`. It is a denylist on `pending` and on gate rejections
 * (`workflow_v4_rejected`, `extracted.gate.is_intelligence: false`), so
 * `workflow_v4`, `kev`, `text_indicator_list`, `seeded` and any future adapter
 * value count; a missing `extraction_method` does not.
 *
 * Consumers: the threat intel find route, the readiness route, and the AlertZero
 * hunt candidate selector.
 *
 * Indicator-eligible: at least one nested IOC. Find and readiness AND it with
 * hunt-usable; promote keeps its own IOC-only filter. KEV reports are hunt-usable
 * but not indicator-eligible.
 *
 * Future work: a CVE-to-environment vuln hunt.
 */

/** Hunt-usable bar; see the contract comment at the top of this file. */
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
    must_not: [
      { term: { 'lineage.extraction_method': 'pending' } },
      { term: { 'lineage.extraction_method': 'workflow_v4_rejected' } },
      { term: { 'extracted.gate.is_intelligence': false } },
    ],
  },
};

/**
 * Indicator-eligible bar; AND with `HUNT_USABLE_FILTER`. `extracted.iocs` is
 * nested, so exists on the parent path matches nothing.
 */
export const INDICATOR_ELIGIBLE_FILTER: estypes.QueryDslQueryContainer = {
  nested: {
    path: 'extracted.iocs',
    query: {
      exists: { field: 'extracted.iocs.value' },
    },
  },
};
