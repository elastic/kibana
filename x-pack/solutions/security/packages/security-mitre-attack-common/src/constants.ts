/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreFramework } from './schema';
import type { MitreEntityStatus } from './types';

/** Framework applied when a caller does not specify one. */
export const DEFAULT_MITRE_FRAMEWORK: MitreFramework = 'enterprise';

/** Entity status applied when a caller does not specify one; excludes revoked and deprecated entities. */
export const DEFAULT_MITRE_ENTITY_STATUS: MitreEntityStatus = 'active';
