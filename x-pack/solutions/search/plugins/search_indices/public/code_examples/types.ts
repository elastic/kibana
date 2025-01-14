/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateIndexCodeDefinition, IngestDataCodeDefinition } from '../types';

export interface CreateIndexLanguageExamples {
  default: CreateIndexCodeDefinition;
  dense_vector: CreateIndexCodeDefinition;
}

export interface IngestDataLanguageExamples {
  dense_vector: IngestDataCodeDefinition;
}
