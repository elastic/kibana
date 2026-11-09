/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationQuotaLimit } from '../../types';

const MESSAGES: Record<InvestigationQuotaLimit, string> = {
  automatic: 'The daily limit for automatic investigations has been reached',
  manual: 'The daily limit for manual investigations has been reached',
  all: 'The daily limit for all investigations has been reached',
};

const LIMITED_MESSAGES: Record<InvestigationQuotaLimit, (limit: number) => string> = {
  automatic: (limit) => `The daily limit of ${limit} for automatic investigations has been reached`,
  manual: (limit) => `The daily limit of ${limit} for manual investigations has been reached`,
  all: (limit) => `The daily limit of ${limit} for all investigations has been reached`,
};

export class InvestigationQuotaDeniedError extends Error {
  public readonly statusCode = 429;

  constructor(
    public readonly deniedBy: InvestigationQuotaLimit,
    /** The configured value of the limit that denied the start, when known. */
    public readonly limit?: number
  ) {
    super(limit === undefined ? MESSAGES[deniedBy] : LIMITED_MESSAGES[deniedBy](limit));
    this.name = 'InvestigationQuotaDeniedError';
  }
}
