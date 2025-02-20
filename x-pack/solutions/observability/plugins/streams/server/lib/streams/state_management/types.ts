/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Does this create a circular dependency?
import { IScopedClusterClient } from '@kbn/core/server';
import { State } from './state';

export interface ValidationResult {
  isValid: boolean;
  errors: string[]; // Or Errors?
}

export interface Stream {
  validate(
    desiredState: State,
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult>;
}
