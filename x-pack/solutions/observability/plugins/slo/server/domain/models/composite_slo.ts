/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  compositeSloDefinitionSchema,
  compositeSloWithSummaryResponseSchema,
  storedCompositeSloDefinitionSchema,
} from '@kbn/slo-schema';

type CompositeSLODefinition = z.output<typeof compositeSloDefinitionSchema>;
type StoredCompositeSLODefinition = z.input<typeof storedCompositeSloDefinitionSchema>;
type CompositeSLOWithSummary = z.output<typeof compositeSloWithSummaryResponseSchema>;

export type { CompositeSLODefinition, CompositeSLOWithSummary, StoredCompositeSLODefinition };
