/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreFramework } from './schema';
import type { MitreEntityStatus } from './types';

// -------------------------------------------------------------------------
// Default values
// -------------------------------------------------------------------------

/** Framework applied when a caller does not specify one. */
export const DEFAULT_MITRE_FRAMEWORK: MitreFramework = 'enterprise';

/** Entity status applied when a caller does not specify one; excludes revoked and deprecated entities. */
export const DEFAULT_MITRE_ENTITY_STATUS: MitreEntityStatus = 'active';

// -------------------------------------------------------------------------
// API route paths
// -------------------------------------------------------------------------

/** Base path for all internal MITRE API routes. */
export const MITRE_INTERNAL_URL = '/internal/mitre' as const;

/** Path for the GET entities route. */
export const GET_MITRE_ENTITIES_URL = `${MITRE_INTERNAL_URL}/entities` as const;

// -------------------------------------------------------------------------
// Saved Objects
// -------------------------------------------------------------------------

/** Saved Objects type name for MITRE ATT&CK entities. */
export const MITRE_ATTACK_ENTITY_SO_TYPE = 'mitre-attack-entity' as const;
