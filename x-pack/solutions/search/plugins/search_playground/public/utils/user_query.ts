/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { i18n } from '@kbn/i18n';
import type { PlaygroundForm, PlaygroundFormFields, UserQueryValidations } from '../types';

export const validateUserElasticSearchQuery = (
  userQuery: PlaygroundForm[PlaygroundFormFields.userElasticsearchQuery],
  elasticsearchQuery: PlaygroundForm[PlaygroundFormFields.elasticsearchQuery]
): UserQueryValidations => {
  if (userQuery === null || userQuery === undefined || typeof userQuery !== 'string') {
    return { isValid: false, isUserCustomized: false };
  }
  let userQueryErrors: string[] | undefined;
  if (!userQuery.includes('{query}')) {
    userQueryErrors = [
      i18n.translate('xpack.searchPlayground.userQuery.errors.queryPlaceholder', {
        defaultMessage: 'User query must contain "{query}"',
        values: { query: '{query}' },
      }),
    ];
  }
  if (userQuery.trim().length === 0) {
    return { isValid: false, isUserCustomized: true, userQueryErrors };
  }
  let userQueryObject: {} = {};
  try {
    userQueryObject = JSON.parse(userQuery);
  } catch (e) {
    return { isValid: false, isUserCustomized: true, userQueryErrors };
  }
  if (deepEqual(userQueryObject, elasticsearchQuery)) {
    return { isValid: true, isUserCustomized: false };
  }
  if (userQueryErrors && userQueryErrors.length > 0) {
    return {
      isValid: false,
      isUserCustomized: true,
      userQueryErrors,
    };
  }
  return { isValid: true, isUserCustomized: true };
};

export const disableExecuteQuery = (
  validations: UserQueryValidations | undefined,
  query: string | null | undefined
): boolean => {
  return (
    (validations?.isUserCustomized === true && validations?.isValid === false) ||
    !query ||
    query.trim().length === 0
  );
};

export const elasticsearchQueryString = (
  elasticsearchQuery: PlaygroundForm[PlaygroundFormFields.elasticsearchQuery],
  userElasticsearchQuery: PlaygroundForm[PlaygroundFormFields.userElasticsearchQuery],
  userElasticsearchQueryValidations: PlaygroundForm[PlaygroundFormFields.userElasticsearchQueryValidations]
) => {
  if (!userElasticsearchQuery || userElasticsearchQueryValidations?.isUserCustomized === false) {
    return JSON.stringify(elasticsearchQuery);
  }
  if (userElasticsearchQueryValidations?.isValid === true) {
    return userElasticsearchQuery;
  }
  return JSON.stringify(elasticsearchQuery);
};

export const elasticsearchQueryObject = (
  elasticsearchQuery: PlaygroundForm[PlaygroundFormFields.elasticsearchQuery],
  userElasticsearchQuery: PlaygroundForm[PlaygroundFormFields.userElasticsearchQuery],
  userElasticsearchQueryValidations: PlaygroundForm[PlaygroundFormFields.userElasticsearchQueryValidations]
): { retriever: any } => {
  if (!userElasticsearchQuery || userElasticsearchQueryValidations?.isUserCustomized === false) {
    return elasticsearchQuery;
  }
  if (userElasticsearchQueryValidations?.isValid === true) {
    return JSON.parse(userElasticsearchQuery);
  }
  return elasticsearchQuery;
};

export const formatElasticsearchQueryString = (
  elasticsearchQuery: PlaygroundForm[PlaygroundFormFields.elasticsearchQuery]
) => JSON.stringify(elasticsearchQuery, null, 2);
