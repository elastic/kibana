/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { policyStepFailureOutputSchema } from '../../../../../common/workflows/step_types/endpoint/policies/output_schemas';
import type { presentPolicyError } from '../../../../endpoint/services/policy_management/presentation/present_policy_error';
import { omitTrailingToFit } from '../../../../endpoint/services/policy_management/presentation/trim_policy_result';

export const presentPolicyStepError = ({
  message,
  metadata,
}: ReturnType<typeof presentPolicyError>) => {
  const base = policyStepFailureOutputSchema.parse({ status: 'error', message, ...metadata });
  const { rejections } = base;
  if (rejections !== undefined) {
    return omitTrailingToFit(
      (keep) => ({
        ...base,
        rejections: rejections.slice(0, keep),
        ...(keep < rejections.length ? { rejections_truncated: true } : {}),
      }),
      rejections.length,
      8_000
    );
  }
  return base;
};
