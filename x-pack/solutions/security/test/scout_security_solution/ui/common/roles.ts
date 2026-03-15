/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { ROLES } from '@kbn/security-solution-plugin/common/test';

/**
 * Security Solution role names used for test authentication.
 * Maps to KNOWN_SERVERLESS_ROLE_DEFINITIONS and KNOWN_ESS_ROLE_DEFINITIONS.
 */
export const socManagerRole = ROLES.soc_manager as unknown as KibanaRole;
export const t1AnalystRole = ROLES.t1_analyst as unknown as KibanaRole;
export const t2AnalystRole = ROLES.t2_analyst as unknown as KibanaRole;
export const readerRole = ROLES.reader as unknown as KibanaRole;
export const platformEngineerRole = ROLES.platform_engineer as unknown as KibanaRole;
