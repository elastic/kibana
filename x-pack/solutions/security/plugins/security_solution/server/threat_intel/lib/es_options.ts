/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpandWildcards } from '@elastic/elasticsearch/lib/api/types';

/**
 * The plugin-owned threat intel indices (`.kibana-threat-reports`,
 * `.kibana-threat-intel-sources`, `.threat-intel-indicators`) are hidden, so a
 * wildcard read skips them unless it opts in. Every wildcard search, PIT, and
 * update-by-query against them has to spread this.
 *
 * It lives here rather than in `setup/index_templates` because routes and tasks
 * need it and must not depend on the setup layer, and rather than in `common`
 * because it is an Elasticsearch search option with no meaning in the browser
 * bundle.
 */
export const HIDDEN_INDEX_SEARCH_OPTIONS = {
  expand_wildcards: ['open', 'hidden'] as ExpandWildcards,
  ignore_unavailable: true,
  allow_no_indices: true,
};
