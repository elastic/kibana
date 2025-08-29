/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { sloDefinitionSchema, sloIdSchema, storedSloDefinitionSchema } from '@kbn/slo-schema';
import type * as t from 'io-ts';

type SLODefinition = t.TypeOf<typeof sloDefinitionSchema>;
type StoredSLODefinition = t.OutputOf<typeof storedSloDefinitionSchema>;
type SLOId = t.TypeOf<typeof sloIdSchema>;

export type { SLODefinition, StoredSLODefinition, SLOId };
