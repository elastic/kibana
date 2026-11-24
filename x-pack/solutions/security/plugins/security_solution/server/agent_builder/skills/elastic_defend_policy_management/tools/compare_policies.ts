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
import type { PolicyRef } from '../../../../endpoint/services/policy_management/domain/input_schemas';
import { createPolicyTool } from './create_policy_tool';
import {
  COMPARE_POLICIES_MAX_RESULT_TOKENS,
  presentComparePolicies,
} from '../../../../endpoint/services/policy_management/presentation/present_compare_policies';

export const COMPARE_POLICIES_TOOL_ID = 'security.policy_management.compare_policies';

export const comparePoliciesSchema = lazySchema(() => {
  const comparePoliciesIdOrNameSelectorSchema = z
    .object({
      idOrName: policyReferenceInputSchema.shape.idOrName.unwrap(),
    })
    .strict();

  const comparePoliciesPresetSelectorSchema = z
    .object({
      preset: policyReferenceInputSchema.shape.preset.unwrap(),
    })
    .strict();

  const comparePoliciesSideSchema = z.union([
    comparePoliciesIdOrNameSelectorSchema,
    comparePoliciesPresetSelectorSchema,
  ]);

  return z.object({
    from: comparePoliciesSideSchema.describe(
      'Source side of the comparison: pass exactly one selector object, either {"idOrName":"Example policy"} for a user-supplied live policy ID or exact full stored policy name in the current space, or {"preset":"EDRComplete"} for a deployment baseline. Do not send both properties.'
    ),
    to: comparePoliciesSideSchema.describe(
      'Target side of the comparison: pass exactly one selector object, either {"idOrName":"Example policy"} for a user-supplied live policy ID or exact full stored policy name in the current space, or {"preset":"EDRComplete"} for a deployment baseline. Do not send both properties.'
    ),
  });
});

export const createComparePoliciesTool = ({
  endpointAppContextService,
}: {
  endpointAppContextService: EndpointAppContextService;
}): BuiltinSkillBoundedTool<typeof comparePoliciesSchema> =>
  createPolicyTool({
    endpointAppContextService,
    id: COMPARE_POLICIES_TOOL_ID,
    description:
      'Compare two Elastic Defend policy sides in the current space. ' +
      'Each side independently accepts a live policy (idOrName) or a preset (EDRComplete, NGAV, EDREssential, DataCollection) ' +
      "for this deployment's default configuration for that preset, which is a deployment default, not a best-practice recommendation. " +
      'A baseline side reports its resolved environment instead of a policy identity. ' +
      'Returns side references, hashes, and a bounded deterministic diff, ' +
      'plus normalized_posture_equal computed from the complete normalized comparison, which excludes meta.* and *.popup.*.message. ' +
      'The visible diffs list can be bounded independently of that equality result. ' +
      'value_truncated true means the visible diffs are incomplete and value_total is the complete count; ' +
      'a from_truncation or to_truncation summary on a diff entry means that displayed value is partial. ' +
      'Each summary lists truncation sites with paths relative to that value, distinguishes string, array, and object truncation, ' +
      'and is capped at 50 entries, with entries_truncated true and entries_total disclosing further sites. ' +
      'Returned live identities follow the same rule: policy.id is the stable later idOrName, and a name with name_string_truncated true is display-only. ' +
      'A null from or to value means that path is absent on that side; when exactly one side lacks that leaf, the entry carries absent_side naming that side. ' +
      'Each diff entry carries writable and, when writable is false, not_writable_reason: one of unknown_path, derived_setting, advanced_setting, not_user_editable, coupled_only, not_supported_by_skill, or missing_on_one_side. ' +
      'missing_on_one_side means one side lacks a setting this skill cannot create. ' +
      'A one-sided *.device_control.usb_storage row is writable only when the same comparison also has a one-sided *.device_control.enabled row for that operating system whose present value is true. ' +
      'Writable entries are listed first and are never removed by the display cap. ' +
      'Does not count endpoints or write policies.',
    schema: comparePoliciesSchema,
    maxResultTokens: COMPARE_POLICIES_MAX_RESULT_TOKENS,
    run: async (
      {
        from,
        to,
      }: {
        from: z.infer<typeof comparePoliciesSchema>['from'];
        to: z.infer<typeof comparePoliciesSchema>['to'];
      },
      service
    ) => {
      const refs: Readonly<{ from: PolicyRef; to: PolicyRef }> = {
        from: toPolicyRef(from),
        to: toPolicyRef(to),
      };
      const {
        from: fromRead,
        to: toRead,
        diffs,
      } = await service.comparePolicies(refs.from, refs.to);

      return presentComparePolicies(fromRead, toRead, diffs);
    },
  });
