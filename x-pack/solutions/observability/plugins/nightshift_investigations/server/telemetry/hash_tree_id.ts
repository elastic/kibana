/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/**
 * One-way SHA-256 of a tree id, as hex. It lets telemetry group and compare trees across events
 * without carrying the slug itself. The hash is unsalted, so it keeps slugs out of the payload but
 * does not stop someone who can guess a slug from confirming it: treat it as pseudonymous, not
 * anonymous.
 */
export const hashTreeId = (treeId: string): string =>
  createHash('sha256').update(treeId).digest('hex');
