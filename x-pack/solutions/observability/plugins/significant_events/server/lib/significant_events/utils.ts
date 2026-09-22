/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { orderBy } from 'lodash';

/**
 * Sort query links for the Discovery "Queries" table.
 */
export function sortQueryLinksForTable(queryLinks: QueryLink[]): QueryLink[] {
  return orderBy(
    queryLinks,
    ['rule_backed', (link) => link.query.severity_score ?? 0, (link) => link.query.title],
    ['asc', 'desc', 'asc']
  );
}
