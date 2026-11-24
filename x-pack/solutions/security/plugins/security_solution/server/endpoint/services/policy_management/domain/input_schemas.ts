/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointPolicyPreset } from '../../../../../common/endpoint/constants';
import {
  policyReferenceInputSchema,
  type PolicyReferenceInput,
} from '../../../../../common/workflows/step_types/endpoint/policies/policy_reference';

export type PolicyRef =
  | Readonly<{ type: 'policy'; idOrName: string }>
  | Readonly<{ type: 'baseline'; preset: EndpointPolicyPreset }>;

export const toPolicyRef = (input: PolicyReferenceInput): PolicyRef => {
  const parsed = policyReferenceInputSchema.parse(input);
  return 'idOrName' in parsed
    ? { type: 'policy', idOrName: parsed.idOrName }
    : { type: 'baseline', preset: parsed.preset };
};
