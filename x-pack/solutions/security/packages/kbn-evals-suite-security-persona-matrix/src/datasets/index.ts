/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PERSONA_MATRIX_EXAMPLES } from './persona_matrix_prompts';
import type { PersonaMatrixExample } from './persona_matrix_prompts';

export type { PersonaMatrixExample };
export const personaMatrixDataset: PersonaMatrixExample[] = PERSONA_MATRIX_EXAMPLES;
