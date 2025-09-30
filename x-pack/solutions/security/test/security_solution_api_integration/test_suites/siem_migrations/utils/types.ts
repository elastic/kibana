/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RequestParams {
  /** Optional expected status code parameter */
  expectStatusCode?: number;
}

export interface MigrationRequestParams extends RequestParams {
  /** `id` of the migration to get rules documents for */
  migrationId: string;
}
