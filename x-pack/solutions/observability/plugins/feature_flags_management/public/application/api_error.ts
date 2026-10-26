/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';

export interface ApiIssue {
  path: string;
  message: string;
}

/**
 * Normalized API failure. `issues` comes from `attributes.issues` when the server sends it.
 */
export class FeatureFlagsApiError extends Error {
  public readonly statusCode?: number;
  public readonly issues: readonly ApiIssue[];

  constructor(message: string, statusCode?: number, issues: readonly ApiIssue[] = []) {
    super(message);
    this.name = 'FeatureFlagsApiError';
    this.statusCode = statusCode;
    this.issues = issues;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readIssues = (attributes: unknown): ApiIssue[] => {
  if (!isRecord(attributes) || !Array.isArray(attributes.issues)) {
    return [];
  }
  return attributes.issues.flatMap((issue) => {
    if (!isRecord(issue) || typeof issue.path !== 'string' || typeof issue.message !== 'string') {
      return [];
    }
    return [{ path: issue.path, message: issue.message }];
  });
};

const unknownErrorMessage = () =>
  i18n.translate('xpack.featureFlagsManagement.api.unknownErrorMessage', {
    defaultMessage: 'Something went wrong.',
  });

/** The repository uses this sentence when `version` no longer matches the stored document. */
export const isVersionConflict = (error: FeatureFlagsApiError): boolean =>
  error.statusCode === 409 && error.message.includes('changed by someone else');

/**
 * The message Kibana shows. When structured issues exist, the first line is enough:
 * the server also repeats those issues as bullets inside `message`.
 */
export const apiErrorSummary = (error: FeatureFlagsApiError): string =>
  error.issues.length > 0 ? error.message.split('\n')[0] : error.message;

export const toFeatureFlagsApiError = (error: unknown): FeatureFlagsApiError => {
  if (error instanceof FeatureFlagsApiError) {
    return error;
  }

  if (isHttpFetchError(error)) {
    const body = error.body;
    const issues = isRecord(body) ? readIssues(body.attributes) : [];
    const message =
      isRecord(body) && typeof body.message === 'string' && body.message
        ? body.message
        : error.message || unknownErrorMessage();
    const statusFromBody =
      isRecord(body) && typeof body.statusCode === 'number' ? body.statusCode : undefined;
    return new FeatureFlagsApiError(message, error.response?.status ?? statusFromBody, issues);
  }

  if (error instanceof Error && error.message) {
    return new FeatureFlagsApiError(error.message);
  }

  return new FeatureFlagsApiError(unknownErrorMessage());
};
