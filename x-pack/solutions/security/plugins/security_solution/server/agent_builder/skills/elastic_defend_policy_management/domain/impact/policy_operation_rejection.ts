/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PathNotWritableReason } from '../field_registry';
import type { SetFieldValueDomain } from './validate_set_field_value';

export type PolicyOperationRejectionReason =
  | PathNotWritableReason
  | 'current_value_missing'
  | 'invalid_value'
  | 'conflicting_operations'
  | 'invalid_combination';

export interface PolicyOperationRejection {
  readonly operationIndexes: readonly number[];
  readonly path?: string;
  readonly reason: PolicyOperationRejectionReason;
  readonly acceptedValues?: SetFieldValueDomain;
}

export const POLICY_CHANGE_REJECTED_MESSAGE =
  'One or more requested policy operations were rejected; see rejections.';

export class PolicyChangeRejectedError extends Error {
  public readonly rejections: readonly PolicyOperationRejection[];

  constructor(rejections: readonly PolicyOperationRejection[]) {
    super(POLICY_CHANGE_REJECTED_MESSAGE);
    this.name = 'PolicyChangeRejectedError';
    this.rejections = rejections;
  }
}
