/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationSchema, statusSchema } from '@kbn/investigation-shared';

export type Investigation = z.infer<typeof investigationSchema>;
export type InvestigationStatus = z.infer<typeof statusSchema>;
export type StoredInvestigation = z.infer<typeof investigationSchema>;
