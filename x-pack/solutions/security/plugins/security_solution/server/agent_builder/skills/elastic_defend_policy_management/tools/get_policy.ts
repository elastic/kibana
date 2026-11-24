/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z, lazySchema } from '@kbn/zod/v4';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import {
  policyReferenceInputSchema,
  toPolicyRef,
} from '../../../../endpoint/services/policy_management/domain/input_schemas';
import { createPolicyTool } from './create_policy_tool';
import {
  GET_POLICY_MAX_RESULT_TOKENS,
  presentGetPolicy,
  presentGetPolicyBaseline,
} from '../../../../endpoint/services/policy_management/presentation/present_get_policy';

export const GET_POLICY_TOOL_ID = 'security.policy_management.get_policy';

export const getPolicySchema = lazySchema(() => {
  const getPolicyIdOrNameSelectorSchema = z
    .object({
      idOrName: policyReferenceInputSchema.shape.idOrName
        .unwrap()
        .describe(
          'User-supplied live policy identity: saved-object id or exact full stored endpoint policy name in the current space, or a returned policy id. A creation preset does not select the live policy. Valid: {"selector":{"idOrName":"Example policy"}}. Do not send null, an empty string, or placeholder text. These examples are not a policy selection. A presented name with name_string_truncated true is display-only; pass the policy id as later idOrName.'
        ),
    })
    .strict();

  const getPolicyPresetSelectorSchema = z
    .object({
      preset: policyReferenceInputSchema.shape.preset
        .unwrap()
        .describe(
          'An explicitly requested deployment baseline (EDRComplete, NGAV, EDREssential, DataCollection), not a live policy. Valid: {"selector":{"preset":"EDRComplete"}}. Do not send null or placeholder text. These examples are not a policy selection.'
        ),
    })
    .strict();

  return z
    .object({
      selector: z
        .union([getPolicyIdOrNameSelectorSchema, getPolicyPresetSelectorSchema])
        .describe(
          'Exactly one selector object. {"selector":{"idOrName":"Example policy"}} selects a live policy id or exact stored name; {"selector":{"preset":"EDRComplete"}} selects an explicitly requested deployment baseline. The selector object carries exactly one required property. Invalid: {"idOrName":"Example policy"}, {"selector":{"idOrName":"Example policy","preset":"EDRComplete"}}, and {"selector":{}}. Do not send idOrName or preset at the root, both properties in one selector, null, or placeholder text. These examples are not a policy selection.'
        ),
    })
    .strict();
});

export const createGetPolicyTool = ({
  endpointAppContextService,
}: {
  endpointAppContextService: EndpointAppContextService;
}): BuiltinSkillBoundedTool<typeof getPolicySchema> =>
  createPolicyTool({
    endpointAppContextService,
    id: GET_POLICY_TOOL_ID,
    description:
      'Get one Elastic Defend endpoint policy. Pass exactly one required selector object. ' +
      '{"selector":{"idOrName":"Example policy"}}: a user-supplied saved-object id or exact full stored name in the current space, or a returned policy id. A creation preset does not select the live policy. ' +
      '{"selector":{"preset":"EDRComplete"}}: an explicitly requested deployment baseline (EDRComplete, NGAV, EDREssential, DataCollection). A live identity does not select a baseline. ' +
      'The selector object carries exactly one property. Invalid: {"idOrName":"Example policy"} and {"selector":{"idOrName":"Example policy","preset":"EDRComplete"}}. Do not send idOrName or preset at the root, both properties in one selector, null, or placeholder values. These examples are not a policy selection. ' +
      "A preset reads this deployment's default configuration for that preset. " +
      "A preset result is this deployment's baseline default, not a best-practice recommendation, " +
      'and reports the resolved environment (license, cloud, telemetryOptedIn; telemetryOptedIn "unresolved" means the deployment default for telemetry is unconfirmed), ' +
      'a protection-mode summary, and the normalized baseline config. ' +
      'A returned baseline config overrides any field-reference factory default for cloud- or telemetry-dependent values. ' +
      'Returns bounded identity or baseline reference, a full-config normalized hash, and a structurally bounded presented config. ' +
      'When the config is trimmed, config_truncation lists the truncation sites with paths relative to the config; ' +
      'it distinguishes string, array, and object truncation, and is capped at 50 entries with entries_truncated true disclosing further sites. ' +
      'When name_string_truncated is true, the displayed name is display-only; pass policy.id as later idOrName. ' +
      'Does not count endpoints or write policies.',
    schema: getPolicySchema,
    maxResultTokens: GET_POLICY_MAX_RESULT_TOKENS,
    run: async (reference: z.infer<typeof getPolicySchema>, service) => {
      const ref = toPolicyRef(reference.selector);

      if (ref.type === 'baseline') {
        return presentGetPolicyBaseline(await service.getPolicyBaseline(ref.preset));
      }

      const { policy, normalizedConfig, normalizedHash } = await service.getPolicy({
        idOrName: ref.idOrName,
      });
      return presentGetPolicy(policy, normalizedConfig, normalizedHash);
    },
  });
