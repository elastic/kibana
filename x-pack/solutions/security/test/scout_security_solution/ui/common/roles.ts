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
export const socManagerRole: KibanaRole = ROLES.soc_manager;
export const t1AnalystRole: KibanaRole = ROLES.t1_analyst;
export const t2AnalystRole: KibanaRole = ROLES.t2_analyst;
export const readerRole: KibanaRole = ROLES.reader;
export const platformEngineerRole: KibanaRole = ROLES.platform_engineer;
