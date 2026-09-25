/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const ScriptSourceCodec = z.looseObject({
  is_generated_script: z.boolean(),
  file_name: z.string(),
});

export const MetadataCodec = z.looseObject({
  is_tls_enabled: z.boolean().optional(),
  script_source: ScriptSourceCodec.optional(),
});
