/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuidAttribute,
  EuidConditional,
  EuidField,
  EuidFieldInstruction,
  EuidSeparator,
} from './entity_schema';

export function field(fieldName: string): EuidField {
  return {
    field: fieldName,
  };
}

export function sep(separator: string): EuidSeparator {
  return {
    separator,
  };
}

export function compose(...composition: EuidAttribute[]): EuidFieldInstruction {
  return {
    composition,
  };
}

export function composeIf(
  conditional: EuidConditional,
  ...composition: EuidAttribute[]
): EuidFieldInstruction {
  return {
    conditional,
    composition,
  };
}
