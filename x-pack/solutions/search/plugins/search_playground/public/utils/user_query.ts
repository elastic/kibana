/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldError } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { PlaygroundForm, PlaygroundFormFields } from '../types';

const USER_QUERY_PLACEHOLDER_MISSING_ERROR = i18n.translate(
  'xpack.searchPlayground.userQuery.errors.queryPlaceholder',
  {
    defaultMessage: 'Elasticsearch query must contain "{query}"',
    values: { query: '{query}' },
  }
);
const USER_QUERY_CANNOT_BE_EMPTY_ERROR = i18n.translate(
  'xpack.searchPlayground.userQuery.errors.queryCannotBeEmpty',
  {
    defaultMessage: 'Elasticsearch query cannot be empty',
  }
);
const USER_QUERY_MUST_BE_VALID_JSON_ERROR = i18n.translate(
  'xpack.searchPlayground.userQuery.errors.queryMustBeValidJson',
  {
    defaultMessage: 'Elasticsearch query must be valid JSON',
  }
);

export const validateUserElasticsearchQuery = (
  userQuery: PlaygroundForm[PlaygroundFormFields.userElasticsearchQuery]
): FieldError | undefined => {
  if (userQuery === null || userQuery === undefined || typeof userQuery !== 'string')
    return undefined;

  if (userQuery.trim().length === 0) {
    return {
      type: 'required',
      message: USER_QUERY_CANNOT_BE_EMPTY_ERROR,
      types: {
        value: USER_QUERY_PLACEHOLDER_MISSING_ERROR,
        required: USER_QUERY_CANNOT_BE_EMPTY_ERROR,
      },
    };
  }
  if (!userQuery.includes('{query}')) {
    return { type: 'value', message: USER_QUERY_PLACEHOLDER_MISSING_ERROR };
  }
  try {
    JSON.parse(userQuery);
  } catch (e) {
    return { type: 'validate', message: USER_QUERY_MUST_BE_VALID_JSON_ERROR }; // return query must be valid JSON error
  }
  return undefined;
};

export const disableExecuteQuery = (
  validElasticsearchQuery: boolean,
  query: string | null | undefined
): boolean => {
  return !validElasticsearchQuery || !query || query.trim().length === 0;
};

export const elasticsearchQueryString = (
  elasticsearchQuery: PlaygroundForm[PlaygroundFormFields.elasticsearchQuery],
  userElasticsearchQuery: PlaygroundForm[PlaygroundFormFields.userElasticsearchQuery],
  userElasticsearchQueryError: FieldError | undefined
) => {
  if (!userElasticsearchQuery) {
    return JSON.stringify(elasticsearchQuery);
  }
  if (userElasticsearchQueryError === undefined) {
    return userElasticsearchQuery;
  }
  return JSON.stringify(elasticsearchQuery);
};

export const elasticsearchQueryObject = (
  elasticsearchQuery: PlaygroundForm[PlaygroundFormFields.elasticsearchQuery],
  userElasticsearchQuery: PlaygroundForm[PlaygroundFormFields.userElasticsearchQuery],
  userElasticsearchQueryError: FieldError | undefined
): { retriever: any } => {
  if (!userElasticsearchQuery) {
    return elasticsearchQuery;
  }
  if (userElasticsearchQueryError === undefined) {
    return JSON.parse(userElasticsearchQuery);
  }
  return elasticsearchQuery;
};

export const formatElasticsearchQueryString = (
  elasticsearchQuery: PlaygroundForm[PlaygroundFormFields.elasticsearchQuery]
) => JSON.stringify(elasticsearchQuery, null, 2);
