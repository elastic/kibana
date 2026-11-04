/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/** Returns a short stable digest for one lead id segment. */
export const hashLeadIdValue = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 16);
