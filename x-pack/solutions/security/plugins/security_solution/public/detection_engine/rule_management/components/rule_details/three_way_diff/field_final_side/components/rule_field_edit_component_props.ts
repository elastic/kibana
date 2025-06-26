/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormData } from '../../../../../../../shared_imports';
import type { DiffableRule } from '../../../../../../../../common/api/detection_engine';

export interface RuleFieldEditComponentProps {
  finalDiffableRule: DiffableRule;
  setFieldValue: SetFieldValueFn;
  resetForm: ResetFormFn;
}

type SetFieldValueFn = (fieldName: string, fieldValue: unknown) => void;

export type ResetFormFn = (options?: {
  resetValues?: boolean;
  defaultValue?: Partial<FormData> | undefined;
}) => void;
