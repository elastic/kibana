/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldErrors, Resolver } from 'react-hook-form';
import { type PlaygroundForm, type SavedPlaygroundForm, PlaygroundFormFields } from '../types';
import { validateUserElasticsearchQuery } from './user_query';

export const playgroundFormResolver: Resolver<PlaygroundForm> = async (values) => {
  const errors: FieldErrors<PlaygroundForm> = {};
  let hasErrors = false;

  const userQueryError = validateUserElasticsearchQuery(
    values[PlaygroundFormFields.userElasticsearchQuery]
  );
  if (userQueryError) {
    errors[PlaygroundFormFields.userElasticsearchQuery] = userQueryError;
    hasErrors = true;
  }

  if (hasErrors) {
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

export const savedPlaygroundFormResolver: Resolver<SavedPlaygroundForm> = async (values) => {
  const errors: FieldErrors<SavedPlaygroundForm> = {};
  let hasErrors = false;

  const userQueryError = validateUserElasticsearchQuery(
    values[PlaygroundFormFields.userElasticsearchQuery]
  );
  if (userQueryError) {
    errors[PlaygroundFormFields.userElasticsearchQuery] = userQueryError;
    hasErrors = true;
  }

  if (hasErrors) {
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
