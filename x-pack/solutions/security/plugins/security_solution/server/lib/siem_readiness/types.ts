/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/platform/plugins/shared/lens/server/content_management/v1/schema/get.ts
import { objectTypeToGetResultSchema } from '@kbn/content-management-utils';

import { lensSavedObjectSchema } from './common';

export const lensCMGetResultSchema = objectTypeToGetResultSchema(lensSavedObjectSchema);
========
import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../types';

export interface SiemReadinessRoutesDeps {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
}
>>>>>>>> main:x-pack/solutions/security/plugins/security_solution/server/lib/siem_readiness/types.ts
