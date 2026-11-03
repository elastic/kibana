/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

/**
 * The slice of `xpack.securitySolution` a task runtime reads: the experimental flags that decide
 * which tools, skills and attachments exist. Everything else in the section is left alone.
 */
export const tasksConfigSchema = schema.object(
  {
    enableExperimental: schema.arrayOf(schema.string(), { defaultValue: () => [] }),
  },
  { unknowns: 'ignore' }
);

export type TasksConfig = TypeOf<typeof tasksConfigSchema>;
