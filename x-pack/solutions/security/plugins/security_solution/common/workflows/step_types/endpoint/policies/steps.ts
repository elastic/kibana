/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { expectedVersionInputSchema, policyIdentifierInputSchema } from './input_schemas';
import {
  createPolicyFieldReferenceSelectorSchema,
  policyFieldKeywordsInputSchema,
} from './field_reference';
import { listPoliciesInputSchema } from './list_policies';
import {
  policyBaselinePresetInputSchema,
  createPolicyReferenceInputSchema,
} from './policy_reference';
import { createAssessPolicyChangeParamsSchema } from './policy_change_operation';
import {
  createPolicyStepOutputSchema,
  fieldReferenceOutputSchema,
  listPoliciesOutputSchema,
  getPolicyOutputSchema,
  getPolicyBaselineOutputSchema,
  comparePoliciesOutputSchema,
  policyRolloutStatusOutputSchema,
  assessPolicyChangeOutputSchema,
  applyPolicyChangeOutputSchema,
} from './output_schemas';

const stepPolicyIdentifierInputSchema = lazySchema(() =>
  policyIdentifierInputSchema.describe(
    'Policy ID or exact stored name in the execution space. Use an untruncated ID from prior results for subsequent reads.'
  )
);
const stepPolicyBaselinePresetInputSchema = lazySchema(() =>
  policyBaselinePresetInputSchema.describe('Explicit supported deployment preset to resolve.')
);
const getEndpointPolicyFieldReferenceInputSchema = lazySchema(() =>
  z
    .object({
      selector: createPolicyFieldReferenceSelectorSchema({
        keywords: policyFieldKeywordsInputSchema.describe(
          'Single-word keywords naming the setting, not its desired value.'
        ),
      }).describe('Look up a setting path or search by keywords.'),
    })
    .strict()
);
const getEndpointPolicyInputSchema = lazySchema(() =>
  z.object({ idOrName: stepPolicyIdentifierInputSchema }).strict()
);
const getEndpointPolicyBaselineInputSchema = lazySchema(() =>
  z.object({ preset: stepPolicyBaselinePresetInputSchema }).strict()
);
const stepPolicyReferenceInputSchema = lazySchema(() =>
  createPolicyReferenceInputSchema(
    stepPolicyIdentifierInputSchema,
    stepPolicyBaselinePresetInputSchema
  ).describe('Use a live policy ID or exact stored name, or a supported baseline preset.')
);
const compareEndpointPoliciesInputSchema = lazySchema(() =>
  z.object({ from: stepPolicyReferenceInputSchema, to: stepPolicyReferenceInputSchema }).strict()
);
const assessEndpointPolicyChangeInputSchema = lazySchema(() => {
  const paramsSchema = createAssessPolicyChangeParamsSchema(
    'Enable or disable a protection family across supported OSes. Use set_field for a selected OS.',
    'Value to assign; use the field reference’s acceptedValues.',
    {
      protectionLevel: 'Set a protection family’s level across supported OSes.',
      field: 'Set a specific policy path; dependent changes may also result.',
    }
  );
  return paramsSchema.extend({
    idOrName: stepPolicyIdentifierInputSchema,
    changes: paramsSchema.shape.changes.describe(
      'Bounded setting operations to simulate against one live policy.'
    ),
  });
});

const applyEndpointPolicyChangeInputSchema = lazySchema(() =>
  assessEndpointPolicyChangeInputSchema.extend({
    idOrName: policyIdentifierInputSchema.describe(
      'Policy ID or exact stored name in the execution space. Use an untruncated ID from the assessment.'
    ),
    changes: assessEndpointPolicyChangeInputSchema.shape.changes.describe(
      'The setting operations assessed for this policy.'
    ),
    expectedVersion: expectedVersionInputSchema.describe(
      'Opaque policy version from the matching assessment, not a revision or a later read.'
    ),
  })
);

const definePolicyStep = <Input extends z.ZodObject, Result extends z.ZodType>(
  id: string,
  label: string,
  description: string,
  inputSchema: Input,
  resultSchema: Result
): CommonStepDefinition<Input, ReturnType<typeof createPolicyStepOutputSchema<Result>>> => ({
  id,
  label,
  description,
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  exposure: 'managed_only',
  inputSchema,
  outputSchema: lazySchema(() => createPolicyStepOutputSchema(resultSchema)),
});

export const getEndpointPolicyFieldReferenceStepCommonDefinition = definePolicyStep(
  'security.getEndpointPolicyFieldReference',
  i18n.translate('xpack.securitySolution.workflows.steps.getEndpointPolicyFieldReference.label', {
    defaultMessage: 'Get endpoint policy field reference',
  }),
  i18n.translate(
    'xpack.securitySolution.workflows.steps.getEndpointPolicyFieldReference.description',
    {
      defaultMessage:
        'Looks up Elastic Defend setting facts and accepted values; use before selecting settings or validating proposed values. Tech preview; contract can change.',
    }
  ),
  getEndpointPolicyFieldReferenceInputSchema,
  fieldReferenceOutputSchema
);
export const listEndpointPoliciesStepCommonDefinition = definePolicyStep(
  'security.listEndpointPolicies',
  i18n.translate('xpack.securitySolution.workflows.steps.listEndpointPolicies.label', {
    defaultMessage: 'List endpoint policies',
  }),
  i18n.translate('xpack.securitySolution.workflows.steps.listEndpointPolicies.description', {
    defaultMessage:
      'Lists Elastic Defend policies in the execution space; use to inspect posture or optional enrolled-agent usage. Tech preview; contract can change.',
  }),
  lazySchema(() => listPoliciesInputSchema.strict()),
  listPoliciesOutputSchema
);
export const getEndpointPolicyStepCommonDefinition = definePolicyStep(
  'security.getEndpointPolicy',
  i18n.translate('xpack.securitySolution.workflows.steps.getEndpointPolicy.label', {
    defaultMessage: 'Get endpoint policy',
  }),
  i18n.translate('xpack.securitySolution.workflows.steps.getEndpointPolicy.description', {
    defaultMessage:
      'Reads a live Elastic Defend policy by ID or exact name; use to inspect its current identity and configuration. Tech preview; contract can change.',
  }),
  getEndpointPolicyInputSchema,
  getPolicyOutputSchema
);
export const getEndpointPolicyBaselineStepCommonDefinition = definePolicyStep(
  'security.getEndpointPolicyBaseline',
  i18n.translate('xpack.securitySolution.workflows.steps.getEndpointPolicyBaseline.label', {
    defaultMessage: 'Get endpoint policy baseline',
  }),
  i18n.translate('xpack.securitySolution.workflows.steps.getEndpointPolicyBaseline.description', {
    defaultMessage:
      'Reads an Elastic Defend deployment baseline; use to inspect defaults for an explicit supported preset. Tech preview; contract can change.',
  }),
  getEndpointPolicyBaselineInputSchema,
  getPolicyBaselineOutputSchema
);
export const compareEndpointPoliciesStepCommonDefinition = definePolicyStep(
  'security.compareEndpointPolicies',
  i18n.translate('xpack.securitySolution.workflows.steps.compareEndpointPolicies.label', {
    defaultMessage: 'Compare endpoint policies',
  }),
  i18n.translate('xpack.securitySolution.workflows.steps.compareEndpointPolicies.description', {
    defaultMessage:
      'Compares Elastic Defend policies or baselines; use to inspect normalized equality and setting differences. Tech preview; contract can change.',
  }),
  compareEndpointPoliciesInputSchema,
  comparePoliciesOutputSchema
);
export const getEndpointPolicyRolloutStatusStepCommonDefinition = definePolicyStep(
  'security.getEndpointPolicyRolloutStatus',
  i18n.translate('xpack.securitySolution.workflows.steps.getEndpointPolicyRolloutStatus.label', {
    defaultMessage: 'Get endpoint policy rollout status',
  }),
  i18n.translate(
    'xpack.securitySolution.workflows.steps.getEndpointPolicyRolloutStatus.description',
    {
      defaultMessage:
        'Reads counts-only Elastic Defend assigned-versus-applied evidence; use to inspect policy revision coverage and current-revision responses. Tech preview; contract can change.',
    }
  ),
  getEndpointPolicyInputSchema,
  policyRolloutStatusOutputSchema
);
export const assessEndpointPolicyChangeStepCommonDefinition = definePolicyStep(
  'security.assessEndpointPolicyChange',
  i18n.translate('xpack.securitySolution.workflows.steps.assessEndpointPolicyChange.label', {
    defaultMessage: 'Assess endpoint policy change',
  }),
  i18n.translate('xpack.securitySolution.workflows.steps.assessEndpointPolicyChange.description', {
    defaultMessage:
      'Simulates setting changes against one live Elastic Defend policy; use to inspect proposed effects and eligibility before saving. Tech preview; contract can change.',
  }),
  assessEndpointPolicyChangeInputSchema,
  assessPolicyChangeOutputSchema
);
export const applyEndpointPolicyChangeStepCommonDefinition = definePolicyStep(
  'security.applyEndpointPolicyChange',
  i18n.translate('xpack.securitySolution.workflows.steps.applyEndpointPolicyChange.label', {
    defaultMessage: 'Apply endpoint policy change',
  }),
  i18n.translate('xpack.securitySolution.workflows.steps.applyEndpointPolicyChange.description', {
    defaultMessage:
      'Applies assessed setting changes to one Elastic Defend policy after caller confirmation. Do not retry automatically. Tech preview; contract can change.',
  }),
  applyEndpointPolicyChangeInputSchema,
  applyPolicyChangeOutputSchema
);
