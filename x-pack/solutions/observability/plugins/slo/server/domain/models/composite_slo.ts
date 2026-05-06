/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  compositeSloDefinitionSchema,
  storedCompositeSloDefinitionSchema,
} from '@kbn/slo-schema';

type CompositeSLODefinition = z.infer<typeof compositeSloDefinitionSchema>;
type StoredCompositeSLODefinition = z.infer<typeof storedCompositeSloDefinitionSchema>;

export type { CompositeSLODefinition, StoredCompositeSLODefinition };
