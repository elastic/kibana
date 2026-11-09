/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

/** The clauses that name one field and look for exactly that name, with no pattern. */
const SINGLE_FIELD_CLAUSES = ['match_phrase', 'match', 'range'];

/**
 * The first field name with a wildcard in a clause that cannot take one. Without a data view to
 * expand `browser.*` into its fields, Elasticsearch looks for the field `browser.*` itself and
 * matches nothing, so every panel would come back empty with no word why.
 */
const findWildcardField = (node: unknown): string | undefined => {
  if (Array.isArray(node)) {
    return node.map(findWildcardField).find((field) => field !== undefined);
  }
  if (typeof node !== 'object' || node === null) {
    return undefined;
  }
  for (const [key, value] of Object.entries(node)) {
    if (SINGLE_FIELD_CLAUSES.includes(key) && typeof value === 'object' && value !== null) {
      const field = Object.keys(value).find((name) => name.includes('*'));
      if (field !== undefined) {
        return field;
      }
    }
    const nested = findWildcardField(value);
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
};

export type KueryTranslation = { query: estypes.QueryDslQueryContainer } | { issue: string };

/**
 * The query a KQL expression stands for, or what is wrong with it: it does not parse, or it names
 * a field by a pattern. The fields are the stored ones of the OTel indices, so no data view is
 * needed, and a field name cannot be a pattern. The server and the query bar both use it, so the
 * bar refuses what the routes would answer with a 400.
 */
export const translateKuery = (kuery: string): KueryTranslation => {
  let query: estypes.QueryDslQueryContainer;
  try {
    query = toElasticsearchQuery(fromKueryExpression(kuery)) as estypes.QueryDslQueryContainer;
  } catch (error) {
    return { issue: error instanceof Error ? error.message : String(error) };
  }
  const wildcardField = findWildcardField(query);
  return wildcardField === undefined
    ? { query }
    : {
        issue: i18n.translate('xpack.digitalExperience.kuery.fieldWildcard', {
          defaultMessage: '{field} has a wildcard, and a field must be named in full',
          values: { field: wildcardField },
        }),
      };
};
