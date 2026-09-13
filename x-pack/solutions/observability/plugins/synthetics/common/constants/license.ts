/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-types';

/** Minimum stack license required to enable scalable (agent-sharded) private locations. */
export const AGENT_SHARDING_MIN_LICENSE: LicenseType = 'enterprise';
