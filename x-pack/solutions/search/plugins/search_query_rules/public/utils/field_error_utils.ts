/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldError } from 'react-hook-form';

export const isFieldError = (error?: { type?: string; message?: string }): error is FieldError => {
  return !!error && error.type !== undefined && error.message !== undefined;
};

export const isQueryRuleFieldError = (error?: {
  values?: { type?: string; message?: string };
  metadata?: { type?: string; message?: string };
}): error is {
  values?: FieldError;
  metadata?: FieldError;
} => {
  return (
    (error?.values !== undefined && isFieldError(error.values)) ||
    (error?.metadata !== undefined && isFieldError(error.metadata))
  );
};
