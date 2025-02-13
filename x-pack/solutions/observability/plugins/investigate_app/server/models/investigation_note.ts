/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationNoteSchema } from '@kbn/investigation-shared';

export type InvestigationNote = z.infer<typeof investigationNoteSchema>;
export type StoredInvestigationNote = z.infer<typeof investigationNoteSchema>;
