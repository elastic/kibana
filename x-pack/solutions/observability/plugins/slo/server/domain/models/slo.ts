/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { sloDefinitionSchema, sloIdSchema, storedSloDefinitionSchema } from '@kbn/slo-schema';
import type { z } from '@kbn/zod';

type SLODefinition = z.output<typeof sloDefinitionSchema>;
type StoredSLODefinition = z.input<typeof storedSloDefinitionSchema>;
type SLOId = z.output<typeof sloIdSchema>;

export type { SLODefinition, StoredSLODefinition, SLOId };
