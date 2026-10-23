/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  sloDefinitionSchemaZod,
  sloIdSchemaZod,
  storedSloDefinitionSchemaZod,
} from '@kbn/slo-schema';
import type { z } from '@kbn/zod';

type SLODefinition = z.output<typeof sloDefinitionSchemaZod>;
type StoredSLODefinition = z.input<typeof storedSloDefinitionSchemaZod>;
type SLOId = z.output<typeof sloIdSchemaZod>;

export type { SLODefinition, StoredSLODefinition, SLOId };
