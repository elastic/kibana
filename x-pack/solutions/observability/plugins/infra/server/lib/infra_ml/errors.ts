/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import {
  UnknownMLCapabilitiesError,
  InsufficientMLCapabilities,
  MLPrivilegesUninitialized,
} from '@kbn/ml-plugin/server';

export class NoLogAnalysisMlJobError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InsufficientLogAnalysisMlJobConfigurationError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnknownCategoryError extends Error {
  constructor(categoryId: number) {
    super(`Unknown ml category ${categoryId}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InsufficientAnomalyMlJobsConfigured extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const isMlPrivilegesError = (error: any) => {
  return (
    error instanceof UnknownMLCapabilitiesError ||
    error instanceof InsufficientMLCapabilities ||
    error instanceof MLPrivilegesUninitialized
  );
};
