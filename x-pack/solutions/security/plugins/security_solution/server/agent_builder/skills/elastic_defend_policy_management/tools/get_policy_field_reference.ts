/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { StartServicesAccessor } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import {
  getPolicyFieldReferenceParamsSchema,
  type FieldReferenceResult,
} from '../services/field_reference';
import { createPolicyTool } from './create_policy_tool';

export type {
  ExactFieldReferenceResult,
  FieldReferenceDocumentationAvailability,
  FieldReferenceLongFormGuidance,
  FieldReferenceResult,
  FieldReferenceSearchHit,
  FieldReferenceWritabilityFacts,
  GetPolicyFieldReferenceParams,
  GetPolicyFieldReferenceSelector,
  OsLessRemainderFieldReferenceResult,
  PresentedFieldReferenceEntry,
  ProtectionKeyFieldReferenceResult,
  SearchFieldReferenceResult,
  UnknownFieldReferenceResult,
} from '../services/field_reference';

export const GET_POLICY_FIELD_REFERENCE_TOOL_ID =
  'security.policy_management.get_policy_field_reference';

const fieldReferencePathSelectorSchema = z
  .object({
    path: getPolicyFieldReferenceParamsSchema.shape.path
      .unwrap()
      .describe(
        'Exact registry path, protection key, or supported OS-less remainder, such as linux.events.dns, malware.mode, or behavior_protection.reputation_service. UI setting words belong in a keywords selector; never invent a path from memory. Valid: {"selector":{"path":"windows.events.dns"}}. Do not send null, an empty string, or placeholder text.'
      ),
  })
  .strict();

const fieldReferenceKeywordsSelectorSchema = z
  .object({
    keywords: getPolicyFieldReferenceParamsSchema.shape.keywords
      .unwrap()
      .describe(
        'One to five single words naming a setting the way the policy UI names it, such as antivirus, credential, dns, or blocklist. Each keyword is one word; do not include the desired value or state.'
      ),
    os: getPolicyFieldReferenceParamsSchema.shape.os
      .optional()
      .describe('Optional operating-system filter. Use only with keywords.'),
  })
  .strict();

export const getPolicyFieldReferenceSchema = z
  .object({
    selector: z
      .union([fieldReferencePathSelectorSchema, fieldReferenceKeywordsSelectorSchema])
      .describe(
        'Exactly one selector object. {"selector":{"path":"windows.events.dns"}} selects an exact registry path, protection key, or supported OS-less remainder; {"selector":{"keywords":["dns"],"os":"mac"}} searches UI words. The selector object carries exactly one required property for path, or keywords with an optional os. Invalid inputs: {"keywords":["dns"]} (no selector wrapper), {"selector":{"path":"windows.events.dns","keywords":["dns"]}}, {"selector":{"path":"windows.events.dns","os":"windows"}}, {"selector":{}}.'
      ),
  })
  .strict();

export const createGetPolicyFieldReferenceTool = ({
  endpointAppContextService,
  getStartServices,
}: {
  endpointAppContextService: EndpointAppContextService;
  getStartServices: StartServicesAccessor;
}): BuiltinSkillBoundedTool<typeof getPolicyFieldReferenceSchema> =>
  createPolicyTool({
    endpointAppContextService,
    getStartServices,
    id: GET_POLICY_FIELD_REFERENCE_TOOL_ID,
    description:
      'Look up Elastic Defend policy settings. Pass exactly one required selector object. ' +
      '{"selector":{"path":"windows.events.dns"}}: an exact registry path, protection key, or supported OS-less remainder; UI setting words belong in keywords, and never invent a path from memory. ' +
      '{"selector":{"keywords":["dns"],"os":"mac"}}: one to five single-word keywords and an optional OS filter; put the operating system in os, never in keywords; do not include the desired value or state. ' +
      'Use exactly one selector. Invalid inputs: {"keywords":["dns"]} (no selector wrapper), {"selector":{"path":"windows.events.dns","keywords":["dns"]}}, {"selector":{"path":"windows.events.dns","os":"windows"}}, {"selector":{}}. ' +
      'For on/off or Detect/Prevent requests that target a whole protection family itself (Malware, Ransomware, Memory threat, Malicious behavior) use set_protection_enabled or set_protection_level instead of this tool, and when the user names an exact API path or a protection key use path first; keywords resolve wording those routes cannot, including a child setting of a protection family such as a blocklist or an on-write scan. ' +
      'Path lookup order is exact path (e.g. linux.events.dns), then protection keyPath (e.g. malware.mode), then OS-less remainder after one supported-OS segment (e.g. behavior_protection.reputation_service); a wrong-OS exact path stays an unknown_path miss. ' +
      'Each keyword must be a case-insensitive substring of the registry path or shared UI label. The candidates are the returned writable results. Results order writable entries first, then registry order. At most 10 result paths are returned; results_total is the full match count and results_truncated is true when more paths matched. If truncated, add a keyword or an os. If results are different settings, ask which one and name their accepted values. ' +
      'Every found entry reports writable and, when false, not_writable_reason (unknown_path, derived_setting, advanced_setting, not_user_editable, coupled_only, not_supported_by_skill); not_supported_by_skill means the setting can be changed in the policy UI but not through this skill. Writable entries report acceptedValues, the values that path accepts: enum values, boolean, string, number, or a manifest_version window with the latest keyword and bounded dates. ' +
      'When the user request includes an explicit setting value, invoke only this tool first and wait for its returned acceptedValues to validate that value before issuing any list_policies, get_policy, compare_policies, or assess_policy_change calls; never batch policy reads in parallel with field reference. ' +
      'Path lookup results, including exact path, protection-key, and OS-less remainder expansions, set `documentationAvailability` to present or absent and `longFormGuidance` to not_retrieved_by_this_tool. Keyword results do not include those fields or `entry.documentation`. ' +
      '`longFormGuidance` means this tool did not retrieve long-form guidance; it is not unavailable after Integration Knowledge retrieval. ' +
      'On path lookup results, restate `entry.documentation` only when `documentationAvailability` is present. ' +
      "`entry.defaultValue` is the argument-less factory default, not this deployment's environment-specific default; " +
      'a returned baseline config overrides it for cloud- or telemetry-dependent values. ' +
      'Does not read or write live policies.',
    schema: getPolicyFieldReferenceSchema,
    run: async (params: z.infer<typeof getPolicyFieldReferenceSchema>, service) => {
      const result: FieldReferenceResult = await service.getPolicyFieldReference(params.selector);
      return { ...result };
    },
  });
