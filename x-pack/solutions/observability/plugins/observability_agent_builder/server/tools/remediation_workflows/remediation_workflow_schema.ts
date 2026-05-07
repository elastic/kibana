/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const standardCoordinationFields = {
  service_name: z
    .string()
    .min(1)
    .describe(
      'Service or workload identifier for this remediation closure (e.g. service.name from the significant event or tools).'
    ),
  namespace: z.string().min(1).describe('Logical scope or namespace (e.g. production, default).'),
  reason: z
    .string()
    .optional()
    .describe(
      'Short rationale recorded with this remediation closure (defaults in the workflow if omitted).'
    ),
};

export const standardCoordinationRemediationToolSchema = z.object({
  workflow_type: z
    .literal('standard_coordination')
    .describe('Standard remediation coordination and audit closure.'),
  ...standardCoordinationFields,
});

/** Fields inferred by the model from the user `query` (no workflow selection). */
export const remediationWorkflowParamsExtractionSchema =
  standardCoordinationRemediationToolSchema.omit({ workflow_type: true });

export const remediationWorkflowSchema = standardCoordinationRemediationToolSchema;

export type RemediationWorkflowToolParams = z.infer<typeof remediationWorkflowSchema>;

export const remediationWorkflowToolInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Natural-language remediation request; must identify service scope and rationale so **Incident Remediation — Standard Coordination** can record closure (e.g. "Record closure for opbeans-go in production — error rate normalized").'
    ),
});

export type RemediationWorkflowToolInput = z.infer<typeof remediationWorkflowToolInputSchema>;

export const omitEmptyStrings = (params: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    if (value === '') {
      continue;
    }
    out[key] = value;
  }
  return out;
};

export const mapRemediationParamsToWorkflowPayload = (
  params: RemediationWorkflowToolParams
): Record<string, unknown> => {
  const { workflow_type: _workflowType, ...rest } = params;
  return omitEmptyStrings(rest as Record<string, unknown>);
};
