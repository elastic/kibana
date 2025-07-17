/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldErrors, Resolver, ResolverOptions } from 'react-hook-form';
import { type PlaygroundForm, type SavedPlaygroundForm, PlaygroundFormFields } from '../types';
import { validateUserElasticsearchQuery } from './user_query';

const REQUIRED_ERROR = { type: 'required' };

const hasErrors = (errors: FieldErrors<PlaygroundForm>): boolean => Object.keys(errors).length > 0;

export const playgroundFormResolver: Resolver<PlaygroundForm> = async (values) => {
  const errors: FieldErrors<PlaygroundForm> = {};

  if (!values[PlaygroundFormFields.summarizationModel]) {
    errors[PlaygroundFormFields.summarizationModel] = REQUIRED_ERROR;
  }
  if (!values[PlaygroundFormFields.prompt]) {
    errors[PlaygroundFormFields.prompt] = REQUIRED_ERROR;
  } else if (!values[PlaygroundFormFields.prompt].trim()) {
    errors[PlaygroundFormFields.prompt] = REQUIRED_ERROR;
  }
  if (!values[PlaygroundFormFields.question]) {
    errors[PlaygroundFormFields.question] = REQUIRED_ERROR;
  } else if (!values[PlaygroundFormFields.question].trim()) {
    errors[PlaygroundFormFields.question] = REQUIRED_ERROR;
  }

  const userQueryError = validateUserElasticsearchQuery(
    values[PlaygroundFormFields.userElasticsearchQuery]
  );
  if (userQueryError) {
    errors[PlaygroundFormFields.userElasticsearchQuery] = userQueryError;
  }

  if (!values[PlaygroundFormFields.indices] || values[PlaygroundFormFields.indices].length === 0) {
    errors[PlaygroundFormFields.indices] = REQUIRED_ERROR;
  } else {
    const queryFieldsCount = Object.values(values[PlaygroundFormFields.queryFields] ?? {}).reduce(
      (count, indexQueryFields) => count + (indexQueryFields?.length || 0),
      0
    );
    if (queryFieldsCount === 0) {
      errors[PlaygroundFormFields.queryFields] = {
        [values[PlaygroundFormFields.indices][0]]: REQUIRED_ERROR,
      };
    }
  }

  if (hasErrors(errors)) {
    return {
      values: {},
      errors,
    };
  }

  return {
    values,
    errors: {},
  };
};

export const savedPlaygroundFormResolver: Resolver<SavedPlaygroundForm> = async (
  values,
  context,
  options
) => {
  const baseResult = await playgroundFormResolver(
    values,
    context,
    options as unknown as ResolverOptions<PlaygroundForm>
  );

  return baseResult;
};
