/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { AccessesIntegrationConfig } from './types';
export { elasticDefendIntegration } from './elastic_defend';

import { elasticDefendIntegration } from './elastic_defend';
import type { AccessesIntegrationConfig } from './types';

/**
 * Registry of all integration configs the accesses maintainer should process.
 * Add new integrations here (e.g. Active Directory, Okta, Entra ID).
 */
export const INTEGRATION_CONFIGS: AccessesIntegrationConfig[] = [elasticDefendIntegration];
