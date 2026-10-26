/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { sloTemplateSchemaZod, storedSloTemplateSchemaZod } from '@kbn/slo-schema';
import type { z } from '@kbn/zod';

type SLOTemplate = z.output<typeof sloTemplateSchemaZod>;
type StoredSLOTemplate = z.output<typeof storedSloTemplateSchemaZod>;

export type { SLOTemplate, StoredSLOTemplate };
