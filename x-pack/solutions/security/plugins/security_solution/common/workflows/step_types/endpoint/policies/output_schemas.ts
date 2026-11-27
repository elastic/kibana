/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ProtectionModes } from '../../../../endpoint/types';
import {
  POLICY_TRUNCATION_REASONS,
  SET_FIELD_VALUE_TYPES,
  FIELD_REFERENCE_MATCH_MODES,
  POLICY_ASSESSMENT_ADVISORY_CODES,
  POLICY_CHANGE_ORIGIN_KINDS,
  SET_FIELD_MANIFEST_KEYWORDS,
  POLICY_USAGE_CLASSIFICATIONS,
  LIST_USAGE_UNAVAILABLE,
  ENDPOINT_COUNT_SOURCES,
  ENDPOINT_COUNT_POPULATION,
  ENDPOINT_POLICY_LIST_POPULATION,
  FIELD_REFERENCE_DOCUMENTATION_AVAILABILITY,
  FIELD_REFERENCE_LONG_FORM_GUIDANCE,
  FIELD_REFERENCE_UNKNOWN_PATH_REASON,
  POLICY_CHANGE_SIDE_EFFECT_REASON,
  POLICY_COMPARISON_ABSENT_SIDES,
  POLICY_BASELINE_UNRESOLVED_TELEMETRY,
  POLICY_WRITE_OBSERVATION_AVAILABILITY,
  ROLLOUT_COVERAGE_SOURCES,
  ROLLOUT_RESPONSE_SOURCES,
  ROLLOUT_COVERAGE_POPULATION,
  ROLLOUT_RESPONSE_POPULATION,
} from './output_vocabularies';
import { POLICY_CHANGE_PROTECTIONS, policyChangeOperationSchema } from './policy_change_operation';
import { policyBaselinePresetInputSchema } from './policy_reference';
import {
  FIELD_REGISTRY_KINDS,
  FIELD_REGISTRY_SOURCES,
  FIELD_REGISTRY_TIERS,
} from './field_registry';
import { POLICY_ERROR_IDENTITIES } from './policy_errors';
import { RESULT_LIMIT, policyFieldOsInputSchema } from './field_reference';

const text = lazySchema(() => z.string());
const count = lazySchema(() => z.number());
const json = lazySchema(() => z.json());
const flag = lazySchema(() =>
  z
    .literal(true)
    .optional()
    .describe('True when this section or string is partial; omitted data is unknown.')
);
const normalizedHash = lazySchema(() =>
  text.describe(
    'Hash of the complete normalized configuration, independent of displayed partiality.'
  )
);
const config = lazySchema(() =>
  json
    .optional()
    .describe('Normalized configuration; partial output cannot prove a setting is absent.')
);
const writableFlag = lazySchema(() =>
  z.boolean().describe('Whether policy change operations can write the setting.')
);
const notWritableReason = lazySchema(() =>
  text.optional().describe('Why the setting cannot be written through policy change operations.')
);
const os = lazySchema(() =>
  z
    .array(policyFieldOsInputSchema)
    .describe('Affected OSes; a non-OS-specific registry path has an empty list.')
);
const kind = lazySchema(() => z.enum(FIELD_REGISTRY_KINDS));
const source = lazySchema(() =>
  z.enum(FIELD_REGISTRY_SOURCES).describe('Source of registry facts.')
);
const tier = lazySchema(() =>
  z
    .union(FIELD_REGISTRY_TIERS.map((value) => z.literal(value)))
    .describe('Registry classification tier, not operation eligibility.')
);
const operationTag = lazySchema(() =>
  z.union(policyChangeOperationSchema.options.map(({ shape }) => shape.op))
);

const policyIdentityOutputSchema = lazySchema(() =>
  z.object({
    id: text.describe('Truncated IDs are display-only.'),
    name: text.describe(
      'Truncated names are display-only; use an untruncated ID for subsequent reads.'
    ),
    description: text.optional(),
    revision: count.optional().describe('Fleet revision, not a concurrency version token.'),
    version: text.optional().describe('Concurrency version token, distinct from revision.'),
    creationPreset: text.optional().describe('Original creation preset, not current posture.'),
    updatedAt: text.optional(),
    updatedBy: text.optional(),
    packageVersion: text.optional(),
    id_string_truncated: flag,
    name_string_truncated: flag,
    description_string_truncated: flag,
    version_string_truncated: flag,
    [`creationPreset_string_truncated`]: flag,
    [`updatedAt_string_truncated`]: flag,
    [`updatedBy_string_truncated`]: flag,
    [`packageVersion_string_truncated`]: flag,
  })
);

const policyTrimSummaryOutputSchema = lazySchema(() =>
  z
    .object({
      entries: z
        .array(
          z.object({
            path: text.describe('Location of trimmed content within the bounded value.'),
            reason: z.enum(POLICY_TRUNCATION_REASONS),
            total: count.optional().describe('Original container size.'),
          })
        )
        .describe('Trimming log; it may not identify every omission.'),
      entries_truncated: flag.describe('The trimming log is partial.'),
      entries_total: count
        .optional()
        .describe('Total recorded trimming events before log trimming.'),
      output_truncated: flag.describe('The bounded output is partial.'),
      output_total_nodes: count.optional().describe('Original recursive node count.'),
    })
    .describe('Discloses trimming of bounded results; omitted facts are unknown, not absent.')
);

const fromTo = {
  from: lazySchema(() =>
    json.optional().describe('Source value; consult from_truncation independently.')
  ),
  to: lazySchema(() =>
    json.optional().describe('Target value; consult to_truncation independently.')
  ),
  from_truncation: lazySchema(() => policyTrimSummaryOutputSchema.optional()),
  to_truncation: lazySchema(() => policyTrimSummaryOutputSchema.optional()),
};
const environment = lazySchema(() =>
  z.object({
    license: text.describe('Deployment license for baseline defaults.'),
    cloud: z.boolean().describe('Cloud deployment context for baseline defaults.'),
    telemetryOptedIn: z
      .union([z.boolean(), z.literal(POLICY_BASELINE_UNRESOLVED_TELEMETRY)])
      .describe('Telemetry setting; unresolved means unknown.'),
  })
);
const policyPostureOutputSchema = lazySchema(() =>
  z.object({
    windowsProtectionModes: z.object({
      malware: text,
      ransomware: text,
      memoryThreat: text,
      behavior: text,
    }),
    macProtectionModes: z.object({ malware: text, behavior: text }),
    linuxProtectionModes: z.object({
      malware: text,
      ransomware: text,
      behavior: text,
    }),
    globalTelemetryEnabled: z.boolean(),
  })
);

const baselineReference = { preset: policyBaselinePresetInputSchema, environment };
export const getPolicyOutputSchema = lazySchema(() =>
  z.object({
    policy: policyIdentityOutputSchema,
    normalizedHash,
    config,
    config_truncation: policyTrimSummaryOutputSchema.optional(),
  })
);
export const getPolicyBaselineOutputSchema = lazySchema(() =>
  z.object({
    baseline: z
      .object({ type: z.literal('baseline'), ...baselineReference })
      .describe('Deployment-specific defaults, not a live policy or best-practice recommendation.'),
    normalizedHash,
    summary: policyPostureOutputSchema
      .optional()
      .describe('Protection and telemetry posture; missing data is unknown.'),
    config,
    config_truncation: policyTrimSummaryOutputSchema.optional(),
  })
);

export const listPoliciesOutputSchema = lazySchema(() =>
  z.object({
    population: z
      .literal(ENDPOINT_POLICY_LIST_POPULATION)
      .describe(
        'Endpoint integration policies in the execution space, not agent policies or hosts.'
      ),
    page: count.describe('One-based page number.'),
    per_page: count.describe('Requested page capacity, not displayed item count.'),
    items: z
      .array(
        policyIdentityOutputSchema.extend({
          normalizedHash,
          posture: policyPostureOutputSchema,
          usage: z
            .object({
              classification: z
                .enum(POLICY_USAGE_CLASSIFICATIONS)
                .describe(
                  'Enrolled-agent usage classification, not rollout; undetermined does not mean unused.'
                ),
              reason: text.optional().describe('Reason for the usage classification.'),
              enrolled: count
                .optional()
                .describe('Count of enrolled agents, not applied-policy responses.'),
            })
            .optional()
            .describe('Optional enrolled-agent usage; unavailable counts remain unknown.'),
        })
      )
      .describe('Policy page; partial results cannot prove absence.'),
    value_total: count.describe('Total endpoint integration policies in the execution space.'),
    has_more: z
      .boolean()
      .describe('Whether further pages are available; a partial list cannot prove absence.'),
    invalid_policy_count: count.describe(
      'Invalid policies omitted from the returned Fleet page only; not a space-wide count.'
    ),
    items_total: count.optional().describe('Item count before output trimming.'),
    items_truncated: flag,
    usage_truncated: flag.describe('Usage is partial; unknown usage does not mean unused.'),
    usage_unavailable: z
      .literal(LIST_USAGE_UNAVAILABLE)
      .optional()
      .describe('Usage is unavailable; do not classify it as unused.'),
  })
);

const comparisonSide = lazySchema(() =>
  z.union([
    z.object({
      type: z.literal('policy'),
      policy: policyIdentityOutputSchema,
      normalizedHash,
    }),
    z.object({
      type: z.literal('baseline'),
      baseline: z.object(baselineReference),
      normalizedHash,
    }),
  ])
);
export const comparePoliciesOutputSchema = lazySchema(() =>
  z.object({
    from: comparisonSide,
    to: comparisonSide,
    normalized_posture_equal: z
      .boolean()
      .describe(
        'Equality of the complete normalized configurations, independent of displayed partiality.'
      ),
    diffs: z.array(
      z.object({
        path: text,
        ...fromTo,
        writable: writableFlag,
        not_writable_reason: notWritableReason,
        absent_side: z
          .enum(POLICY_COMPARISON_ABSENT_SIDES)
          .optional()
          .describe('Side without a comparable value; not an omission caused by trimming.'),
      })
    ),
    value_total: count.describe('Total diff rows before trimming.'),
    value_truncated: z
      .boolean()
      .describe('Diff-row partiality; each side’s values have independent partiality.'),
  })
);

export const policyRolloutStatusOutputSchema = lazySchema(() =>
  z.object({
    policy: policyIdentityOutputSchema,
    spaceId: text,
    revision_coverage: z
      .object({
        out_of_date_hosts: count.describe('Out-of-date hosts within classified_hosts.'),
        classified_hosts: count.describe(
          'Hosts with classified revision coverage; excludes unknown coverage.'
        ),
        undetermined_hosts: count.describe(
          'Hosts with unknown revision coverage in the returned evidence.'
        ),
        unclassified_overflow_hosts: count.describe(
          'Hosts omitted from revision coverage; their state is unknown.'
        ),
        truncated: z
          .boolean()
          .describe('Revision-coverage partiality, independent of response coverage.'),
        source: z
          .enum(ROLLOUT_COVERAGE_SOURCES)
          .describe('Revision evidence source or availability.'),
        population: z
          .literal(ROLLOUT_COVERAGE_POPULATION)
          .describe('Assignment-matched United hosts, not enrolled-agent counts.'),
      })
      .describe(
        'Assigned-versus-applied counts for the stated population and source. Missing evidence is unknown; do not combine with response counts.'
      ),
    current_revision_responses: z
      .object({
        needs_attention_hosts: count.describe('Hosts needing attention within classified_hosts.'),
        classified_hosts: count.describe(
          'Hosts classified from current-revision responses; excludes unknown and non-current responses.'
        ),
        undetermined_hosts: count.describe(
          'Hosts with unclassifiable response evidence; not healthy hosts.'
        ),
        upstream_unclassified_hosts: count.describe(
          'Hosts unavailable for response lookup; their state is unknown.'
        ),
        truncated: z
          .boolean()
          .describe('Response lookup partiality, independent of response coverage.'),
        source: z
          .enum(ROLLOUT_RESPONSE_SOURCES)
          .describe('Response evidence source or availability.'),
        population: z
          .literal(ROLLOUT_RESPONSE_POPULATION)
          .describe('Assignment-matched current-revision responses, not enrolled-agent counts.'),
        response_coverage_incomplete: z
          .boolean()
          .describe(
            'Response-coverage incompleteness; complete coverage alone does not establish readiness.'
          ),
      })
      .describe(
        'Current-revision response counts for the stated population and source, with independent completeness.'
      ),
  })
);

const policyAcceptedValuesOutputSchema = lazySchema(() =>
  z
    .union([
      z.object({
        type: z.literal(SET_FIELD_VALUE_TYPES.enum),
        values: z.array(text),
      }),
      z.object({
        type: z.literal(SET_FIELD_VALUE_TYPES.manifest_version),
        keywords: z
          .array(z.enum(SET_FIELD_MANIFEST_KEYWORDS))
          .describe('Automatic protection-artifact update keyword.'),
        earliest: text.describe('Earliest accepted manifest date, inclusive.'),
        latest: text.describe(
          'Latest accepted manifest date, inclusive; not the automatic-update keyword.'
        ),
      }),
      z.object({
        type: z.enum([
          SET_FIELD_VALUE_TYPES.boolean,
          SET_FIELD_VALUE_TYPES.string,
          SET_FIELD_VALUE_TYPES.number,
        ]),
      }),
    ])
    .describe('Accepted value domain, not operation eligibility.')
);
const writable = {
  writable: writableFlag,
  not_writable_reason: notWritableReason,
  acceptedValues: lazySchema(() => policyAcceptedValuesOutputSchema.optional()),
};
const registry = {
  path: lazySchema(() => text),
  os,
  tier,
  source,
  documentation: lazySchema(() =>
    text.optional().describe('Inline setting documentation, not long-form Integration Knowledge.')
  ),
  license: lazySchema(() => text.optional().describe('Setting license requirement.')),
  minVersion: lazySchema(() => text.optional().describe('First supported Endpoint version.')),
  maxVersion: lazySchema(() => text.optional().describe('Last supported Endpoint version.')),
  userEditable: lazySchema(() =>
    z.boolean().optional().describe('UI editability, not operation eligibility.')
  ),
  productFeatureGate: lazySchema(() =>
    text.optional().describe('Required product feature; not a deployment eligibility verdict.')
  ),
};
const fieldEntry = lazySchema(() =>
  z.object({
    ...registry,
    kind,
    defaultValue: json
      .optional()
      .describe(
        'Factory default, not a deployment or preset default; omitted details remain unknown.'
      ),
    isDerived: z.boolean().describe('Product-derived setting, not directly writable.'),
    excludeFromComparison: z.boolean().describe('Excluded from normalized comparison.'),
  })
);
const documentationAvailability = lazySchema(() =>
  z
    .enum(FIELD_REFERENCE_DOCUMENTATION_AVAILABILITY)
    .describe('Inline setting documentation availability, not Integration Knowledge availability.')
);
const longFormGuidance = lazySchema(() =>
  z
    .literal(FIELD_REFERENCE_LONG_FORM_GUIDANCE)
    .describe('Lookup did not retrieve long-form guidance; its availability remains unknown.')
);
export const fieldReferenceOutputSchema = lazySchema(() =>
  z.object({
    found: z.boolean().describe('Registry match, not a writability or behavior verdict.'),
    match: z.enum(FIELD_REFERENCE_MATCH_MODES).describe('Field-reference lookup or search mode.'),
    path: text.optional(),
    reason: z.literal(FIELD_REFERENCE_UNKNOWN_PATH_REASON).optional(),
    writable: writableFlag.optional(),
    not_writable_reason: notWritableReason,
    acceptedValues: policyAcceptedValuesOutputSchema.optional(),
    documentationAvailability: documentationAvailability.optional(),
    longFormGuidance: longFormGuidance.optional(),
    entry: fieldEntry.optional().describe('Matching registry entry, not the complete registry.'),
    entries: z
      .array(z.object({ ...writable, documentationAvailability, entry: fieldEntry }))
      .optional()
      .describe(
        'Matching registry entries, not the complete registry; omitted entries remain unknown.'
      ),
    keywords: z.array(text).optional(),
    os: policyFieldOsInputSchema.optional(),
    results: z
      .array(
        z.object({
          path: text,
          os,
          label: text.optional(),
          ...writable,
        })
      )
      .max(RESULT_LIMIT)
      .optional()
      .describe('Keyword matches, not the full registry; omitted matches remain unknown.'),
    results_total: count.optional().describe('Keyword match count before result trimming.'),
    results_truncated: z
      .boolean()
      .optional()
      .describe('Keyword matches are partial; omitted facts are unknown.'),
    entries_total: count.optional().describe('Matching entry count before trimming.'),
    entries_truncated: z
      .boolean()
      .optional()
      .describe('Matching field entries are partial; omitted facts are unknown.'),
  })
);

const registryFact = lazySchema(() => z.object(registry));
const changeFact = lazySchema(() =>
  z.object({
    path: text,
    ...fromTo,
    originKind: z
      .enum(POLICY_CHANGE_ORIGIN_KINDS)
      .describe('Relationship to the requested operation.'),
    registryKind: kind,
    origin: z.object({
      operationIndex: count.describe('Zero-based index of the originating requested operation.'),
      op: operationTag,
    }),
    registry: registryFact,
    eligibility: z
      .object({
        eligible: z.boolean().describe('Path eligibility for the assessed change.'),
        reason: text.optional().describe('Why the path is ineligible.'),
      })
      .describe('Change eligibility, not rollout readiness.'),
  })
);
export const assessPolicyChangeOutputSchema = lazySchema(() =>
  z
    .object({
      policy: policyIdentityOutputSchema,
      spaceId: text,
      requestedOperations: z
        .array(
          z.object({
            op: operationTag,
            path: text.optional(),
            protection: text.optional(),
            enabled: z.boolean().optional(),
            mode: text.optional(),
            value: json.optional().describe('Requested value; omitted content remains unknown.'),
            value_truncation: policyTrimSummaryOutputSchema.optional(),
            value_truncated: z
              .literal(true)
              .optional()
              .describe('Requested value is omitted; its contents remain unknown.'),
          })
        )
        .describe('Requested operations with independent partiality.'),
      requestedImpact: z
        .array(changeFact)
        .describe('Direct requested changes with independent partiality.'),
      expandedChanges: z
        .array(changeFact)
        .describe('Direct and coupled changes with independent partiality.'),
      normalizedDiff: z
        .array(z.object({ path: text, ...fromTo }))
        .describe('Live-to-proposed normalized differences with independent partiality.'),
      sideEffects: z
        .array(
          z.object({
            path: text,
            ...fromTo,
            reason: z.literal(POLICY_CHANGE_SIDE_EFFECT_REASON),
            registryKind: kind,
            registry: z.object({ path: text, os, tier, source }),
          })
        )
        .describe('Predicted derived-field changes with independent partiality.'),
      globalBlockers: z
        .array(
          z.object({
            reason: text.describe('Why the proposed change is blocked.'),
          })
        )
        .describe('Change blockers with independent partiality.'),
      advisories: z
        .array(
          z.union([
            z.object({
              code: z.literal(POLICY_ASSESSMENT_ADVISORY_CODES.protection_weakened),
              protection: z.enum(POLICY_CHANGE_PROTECTIONS),
              os,
              to: z
                .enum([ProtectionModes.detect, ProtectionModes.off])
                .describe('Proposed weaker protection mode.'),
              text,
            }),
            z.object({
              code: z.literal(POLICY_ASSESSMENT_ADVISORY_CODES.protection_setting_weakened),
              setting: text.describe('Protection setting weakened by the proposal.'),
              os,
              text,
            }),
            z.object({
              code: z.literal(POLICY_ASSESSMENT_ADVISORY_CODES.global_manifest_version_stale),
              value: text.describe('Proposed protection-artifact date pin.'),
              ageDays: count.describe('Manifest age in days at assessment time.'),
              text,
            }),
          ])
        )
        .describe('Advisories about the proposed change, not a safety or readiness verdict.'),
      blastRadius: z.object({
        population: z
          .literal(ENDPOINT_COUNT_POPULATION)
          .describe(
            'Blast radius counts enrolled agents, not applied-policy responses or readiness.'
          ),
        source: z.enum(ENDPOINT_COUNT_SOURCES).describe('Enrollment evidence source.'),
        status: z
          .record(text, count)
          .describe(
            'Enrolled-agent status counts for this policy. Buckets overlap and must not be summed.'
          ),
      }),
      requested_operations_value_truncated: flag,
      requested_operations_value_total: count
        .optional()
        .describe('Requested operation count before trimming.'),
      requested_impact_value_truncated: flag,
      requested_impact_value_total: count
        .optional()
        .describe('Direct-impact row count before trimming.'),
      expanded_changes_value_truncated: flag,
      expanded_changes_value_total: count
        .optional()
        .describe('Expanded-change row count before trimming.'),
      normalized_diff_value_truncated: flag,
      normalized_diff_value_total: count
        .optional()
        .describe('Normalized diff row count before trimming.'),
      side_effects_value_truncated: flag,
      side_effects_value_total: count.optional().describe('Side-effect row count before trimming.'),
      global_blockers_value_truncated: flag,
      global_blockers_value_total: count.optional().describe('Blocker row count before trimming.'),
    })
    .describe(
      'Simulation only; does not write. from is live and to is proposed, not saved state or rollout readiness. Sections have independent partiality.'
    )
);

const policyStepErrorShape = {
  error: lazySchema(() =>
    z
      .enum(POLICY_ERROR_IDENTITIES)
      .optional()
      .describe('Domain failure identity; not a successful empty result.')
  ),
  before: lazySchema(() =>
    policyIdentityOutputSchema.optional().describe('Identity before an unverified write attempt.')
  ),
  observation: lazySchema(() =>
    z
      .enum(POLICY_WRITE_OBSERVATION_AVAILABILITY)
      .optional()
      .describe('Post-attempt read availability, not verification of write effects.')
  ),
  observed: lazySchema(() =>
    policyIdentityOutputSchema
      .optional()
      .describe('Observed post-attempt identity; does not prove the attempt caused a change.')
  ),
  message: lazySchema(() => text.optional()),
  candidates: lazySchema(() =>
    z
      .array(policyIdentityOutputSchema)
      .optional()
      .describe(
        'Current-space ambiguity candidates; partial results cannot prove absence. None was selected.'
      )
  ),
  candidates_total: lazySchema(() =>
    count.optional().describe('Ambiguity candidate count before limits.')
  ),
  candidates_truncated: lazySchema(() =>
    z
      .boolean()
      .optional()
      .describe('True when ambiguity candidates are partial; omitted candidates remain unknown.')
  ),
  rejections: lazySchema(() =>
    z
      .array(
        z.object({
          operationIndexes: z
            .array(count)
            .describe(
              'Zero-based indexes of implicated operations; an empty list identifies no operation to remove.'
            ),
          path: text.optional(),
          reason: text.describe('Why the operation or policy state was rejected.'),
          acceptedValues: policyAcceptedValuesOutputSchema.optional(),
        })
      )
      .optional()
      .describe('Rejection details, not a successful assessment; omitted reasons remain unknown.')
  ),
  rejections_total: lazySchema(() =>
    count.optional().describe('Total rejection rows before output trimming.')
  ),
  rejections_truncated: lazySchema(() =>
    z
      .boolean()
      .optional()
      .describe('True when rejection rows are partial; omitted reasons remain unknown.')
  ),
};

export const policyStepFailureOutputSchema = lazySchema(() =>
  z.object({ status: z.literal('error'), ...policyStepErrorShape })
);

export const createPolicyStepOutputSchema = <Result extends z.ZodType>(result: Result) =>
  z
    .object({
      status: z
        .enum(['success', 'error'])
        .describe('error means the request failed; there is no result.'),
      result: result
        .optional()
        .describe('Capability result on success only; absent on domain failure.'),
      ...policyStepErrorShape,
      truncation: policyTrimSummaryOutputSchema.optional(),
    })
    .describe('Tech preview; this contract can change.');
