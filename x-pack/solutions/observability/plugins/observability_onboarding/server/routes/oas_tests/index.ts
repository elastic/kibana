/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { testOasGenerationZ4 } from './zod4_native';
import { testOasGenerationZ3ZodOpenapi } from './zod3_zod-openapi';
import { testOasGenerationZ3 } from './zod3';

export const oasTestRoutes = {
  ...testOasGenerationZ3,
  // ...testOasGenerationZ3ZodOpenapi,
  ...testOasGenerationZ4,
};
