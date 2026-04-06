/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { FindRulesSortField } from '../find_rules/find_rules_route.gen';
import type { FindRulesRequestQueryInput } from '../find_rules/find_rules_route.gen';
import { validateFindRulesRequestQuery } from '../find_rules/request_schema_validation';
import type { FindRulesGranularRequestQueryInput } from './find_rules_granular_route.gen';
import {
  MAX_GRANULAR_RULES_FILTER_KQL_LENGTH,
  MAX_GRANULAR_RULES_SEARCH_TERM_LENGTH,
} from './granular_rules_limits';

/**
 * Validates KQL syntax only (not field allow-lists). Empty or whitespace-only strings are accepted.
 */
export const validateGranularRulesKqlFilter = (filter: string | undefined): string[] => {
  if (filter == null || filter.trim() === '') {
    return [];
  }
  if (filter.length > MAX_GRANULAR_RULES_FILTER_KQL_LENGTH) {
    return [`filter exceeds maximum length of ${MAX_GRANULAR_RULES_FILTER_KQL_LENGTH}`];
  }
  try {
    fromKueryExpression(filter);
    return [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [`invalid KQL filter: ${message}`];
  }
};

const validateSortTokens = (sort: string[] | undefined): string[] => {
  if (sort == null || sort.length === 0) {
    return [];
  }
  const errors: string[] = [];
  for (const rawToken of sort) {
    const tokens = rawToken
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    for (const token of tokens) {
      const lastColon = token.lastIndexOf(':');
      if (lastColon <= 0 || lastColon === token.length - 1) {
        errors.push(`invalid sort token "${token}"; expected "<field>:<order>"`);
      } else {
        const field = token.slice(0, lastColon);
        const order = token.slice(lastColon + 1).trim();
        if (order !== 'asc' && order !== 'desc') {
          errors.push(`invalid sort token "${token}"; order must be asc or desc`);
        } else if (!FindRulesSortField.safeParse(field).success) {
          errors.push(`unsupported sort field "${field}"`);
        }
      }
    }
  }
  return errors;
};

/**
 * Additional validation for `_find_granular` beyond generated Zod (gaps parity, KQL parse, sort fields).
 */
export const validateFindRulesGranularRequestQuery = (
  query: FindRulesGranularRequestQueryInput
): string[] => {
  const errors = [...validateFindRulesRequestQuery(query as FindRulesRequestQueryInput)];

  const searchTerm = query.search?.term;
  if (searchTerm != null && searchTerm.length > MAX_GRANULAR_RULES_SEARCH_TERM_LENGTH) {
    errors.push(`search.term exceeds maximum length of ${MAX_GRANULAR_RULES_SEARCH_TERM_LENGTH}`);
  }

  errors.push(...validateGranularRulesKqlFilter(query.filter));
  errors.push(...validateSortTokens(query.sort as string[] | undefined));

  const searchMode = query.search?.mode;
  if (searchMode != null && searchMode !== 'legacy') {
    errors.push(`unsupported search.mode "${searchMode}"`);
  }

  return errors;
};
