/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled } from '@kbn/core/server';
import type { z } from '@kbn/zod';
import { LogExtractionState } from '../domain/definitions/saved_objects';

export const DEFAULT_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution'],
};

export const API_VERSIONS = {
  public: {
    v1: '2023-10-31',
  },
  internal: {
    v2: '2',
  },
};

export type LogExtractionBodyParams = z.infer<typeof LogExtractionBodyParams>;
// timeout: intentionally excluded from LogExtractionBodyParams
// TODO: add timeout once we have a way to set it as a task override param
export const LogExtractionBodyParams = LogExtractionState.pick({
  filter: true,
  fieldHistoryLength: true,
  additionalIndexPatterns: true,
  lookbackPeriod: true,
  frequency: true,
  delay: true,
  docsLimit: true,
}).partial();
