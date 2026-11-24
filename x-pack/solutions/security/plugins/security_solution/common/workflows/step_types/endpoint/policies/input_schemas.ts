/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const POLICY_PATH_MAX_LENGTH = 256;
export const POLICY_IDENTIFIER_MAX_LENGTH = 512;

export const policyIdentifierInputSchema = lazySchema(() =>
  z.string().trim().min(1).max(POLICY_IDENTIFIER_MAX_LENGTH)
);

export const policyPathInputSchema = lazySchema(() =>
  z.string().trim().min(1).max(POLICY_PATH_MAX_LENGTH)
);

export const expectedVersionInputSchema = lazySchema(() =>
  z.string().min(1).max(POLICY_IDENTIFIER_MAX_LENGTH)
);
