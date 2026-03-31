/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkErrorErrorSchema } from '@kbn/securitysolution-io-ts-list-types';

import { ListsErrorWithStatusCode } from '.';

export class ExceptionItemImportError extends Error implements BulkErrorErrorSchema {
  public readonly status_code: number;

  constructor(error: Error, public readonly listId: string, public readonly itemId: string) {
    super(error.message);
    this.status_code = error instanceof ListsErrorWithStatusCode ? error.getStatusCode() : 400;
  }
}
