/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum FieldUpgradeStateEnum {
  NoUpdate = 'NO_UPDATE',
  SameUpdate = 'SAME_UPDATE',
  NoConflict = 'NO_CONFLICT',
  Accepted = 'ACCEPTED',
  SolvableConflict = 'SOLVABLE_CONFLICT',
  NonSolvableConflict = 'NON_SOLVABLE_CONFLICT',
}
