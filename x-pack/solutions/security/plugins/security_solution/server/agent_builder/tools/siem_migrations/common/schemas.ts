/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Bounded migration-id schema. `NonEmptyString` has no upper limit; IDs are interpolated into
 * self-client request paths, so an unbounded input could generate arbitrarily large encoded URLs
 * and error payloads. 256 chars is far above any real UUID while closing the gap.
 */
export const MigrationId = z.string().min(1).max(256).describe('The id of the rule migration.');
