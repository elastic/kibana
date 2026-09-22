/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';

/** A single value's KQL clause, e.g. `field: ("a" or "b")`. */
export const kqlValuesClause = (field: string, values: Array<string | number>): string => {
  const quoted = values.map((v) => `"${escapeQuotes(String(v))}"`);
  return quoted.length === 1 ? `${field}: ${quoted[0]}` : `${field}: (${quoted.join(' or ')})`;
};
