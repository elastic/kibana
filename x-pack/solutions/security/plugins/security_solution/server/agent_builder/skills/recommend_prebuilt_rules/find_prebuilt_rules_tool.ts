/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { createPrebuiltRuleAssetsClient } from '../../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { getInstallableRulesForReview } from '../../../lib/detection_engine/prebuilt_rules/logic/get_installable_rules_for_review';
import { fetchInstalledRuleVersionsMap } from '../../../lib/detection_engine/prebuilt_rules/logic/fetch_installed_rule_versions_map';
import type { MlAuthz } from '../../../lib/machine_learning/authz';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import { buildPrebuiltRulesToolFilter } from './find_prebuilt_rules_filter';

export const FIND_PREBUILT_RULES_INLINE_TOOL_ID = 'security.find_prebuilt_rules';

const MAX_STRING_LENGTH = 10_000;
const MAX_TAG_LENGTH = 1000;
const MAX_RULE_IDS = 50;

// Structured filters that select which installable rules match. Different filters are ANDed;
// array values are ORed within a single filter. Grouped under `filter` to keep the top-level
// schema split between "what to match" (filter) and "how to return it" (fields, perPage, sort).
const findPrebuiltRulesFilterSchema = z
  .object({
    keywords: z
      .string()
      .min(1)
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Free-text keywords matched against rule name and description (case-insensitive, no ' +
          'wildcards). For categorical concepts — Windows, endpoint, LLM, Initial Access — prefer ' +
          'the structured filters (`tags`, `mitreTactic`, etc.); they are more precise.'
      ),
    severity: z
      .array(z.enum(['critical', 'high', 'medium', 'low']))
      .optional()
      .describe('Severity levels to include (OR). E.g. ["critical", "high"].'),
    ruleType: z
      .array(
        z.enum([
          'query',
          'eql',
          'esql',
          'threshold',
          'machine_learning',
          'new_terms',
          'threat_match',
          'saved_query',
        ])
      )
      .optional()
      .describe('Rule types to include (OR). E.g. ["esql", "eql"].'),
    tags: z
      .array(z.string().min(1).max(MAX_TAG_LENGTH))
      .optional()
      .describe(
        'Exact tag values to include (OR). Discover available values first via ' +
          '`security.get_installable_catalog_overview` — call it in the same turn before any ' +
          'tags-filtered search.'
      ),
    mitreTechnique: z
      .array(
        z
          .string()
          .regex(/^T\d{4}(\.\d{3})?$/i)
          .max(MAX_STRING_LENGTH)
      )
      .optional()
      .describe('MITRE technique IDs to include (OR), e.g. ["T1059", "T1059.001"].'),
    mitreTactic: z
      .array(z.string().min(1).max(MAX_STRING_LENGTH))
      .optional()
      .describe(
        'MITRE tactics to include (OR), each either an ID (e.g. "TA0001") or display name ' +
          '(e.g. "Initial Access"). Queries the structured threat field, so it finds rules whose ' +
          'tactic is in rule metadata even when no "Tactic: X" tag is present. Prefer IDs.'
      ),
    relatedIntegrations: z
      .array(z.string().min(1).max(MAX_STRING_LENGTH))
      .optional()
      .describe(
        'Fleet package names a rule depends on (OR). E.g. ["okta", "aws"]. Matches the rule ' +
          "metadata's `related_integrations.package`."
      ),
    ruleIds: z
      .array(z.string().min(1).max(MAX_STRING_LENGTH))
      .max(MAX_RULE_IDS)
      .optional()
      .describe(
        'Deep-fetch specific rules by their `rule_id` signature (OR). Typically used as a ' +
          'follow-up to fetch finalists; omit the other filters when using it. Already-installed ' +
          'IDs return nothing (this tool only sees not-yet-installed rules).'
      ),
  })
  .strict();

export const findPrebuiltRulesSchema = z
  .object({
    filter: findPrebuiltRulesFilterSchema
      .optional()
      .describe(
        'Structured filters selecting which installable rules match. Filters are ANDed together; ' +
          'array values are ORed within a single filter. Omit to match the whole installable catalog.'
      ),
    fields: z
      .array(z.enum(['description', 'query', 'threat', 'note', 'references', 'false_positives']))
      .optional()
      .describe(
        'Opt into deeper per-rule detail beyond the default triage shape (omit for triage only). ' +
          'Available fields: ' +
          '`description` (full rule description); ' +
          '`query` (the detection query/logic; `machine_learning` rules have none); ' +
          '`threat` (full MITRE ATT&CK mapping incl. techniques and subtechniques — triage gives ' +
          'tactics only); ' +
          '`note` (investigation guide / runbook shown when an alert fires); ' +
          '`references` (external reference URLs); ' +
          '`false_positives` (known false-positive scenarios).'
      ),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe('Number of results to return (default 10, max 50).'),
    sort: z
      .object({
        field: z
          .enum(['name', 'risk_score', 'severity'])
          .describe(
            'Field to sort by. Use `severity`/`risk_score` for "most severe"/"highest risk" queries.'
          ),
        order: z.enum(['asc', 'desc']).default('desc').describe('Sort direction (default desc).'),
      })
      .optional()
      .describe('Sort order. Omit to use the default order.'),
  })
  .strict();

// ---- Response shaping ----

// Top-level `security-rule` attribute keys always fetched from ES — they form the default triage
// shape and are also included on deep (`fields`) calls so every row is self-contained. Identity
// fields (rule_id, name, type, version, ...) are intentionally absent here: getInstallableRulesForReview
// always backfills them from the rule-asset baseline, so they come back regardless of this list.
const DEFAULT_FIELDS_TO_FETCH = [
  'severity',
  'risk_score',
  'tags',
  'threat',
  'related_integrations',
] as const;

export const reduceMitreToTacticsOnly = (rule: RuleResponse) => ({
  ...rule,
  threat: (rule.threat ?? [])
    .filter((entry) => entry.framework === 'MITRE ATT&CK')
    .map((entry) => ({ tactic: { id: entry.tactic?.id, name: entry.tactic?.name } })),
});

// ---- Tool handler ----

// Phase 1 assumption: all ML rule types are valid candidates. Replace with a
// licensing-derived MlAuthz in a follow-up if needed.
const permissiveMlAuthz: MlAuthz = {
  validateRuleType: async () => ({ valid: true, message: undefined }),
};

interface FindPrebuiltRulesToolDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

export const createFindPrebuiltRulesInlineTool = ({
  getStartServices,
  logger,
}: FindPrebuiltRulesToolDeps): BuiltinSkillBoundedTool<typeof findPrebuiltRulesSchema> => ({
  id: FIND_PREBUILT_RULES_INLINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Search the catalog of installable (not-yet-installed) Elastic prebuilt detection rules using ' +
    'the structured `filter` object. Returns a compact triage shape per rule by default — rule_id, ' +
    'name, severity, risk_score, tags, MITRE tactics, and related_integrations — plus the ' +
    'total match count. Opt into deeper per-rule detail via `fields`, and deep-fetch specific rules ' +
    'via `filter.ruleIds`. This tool only sees not-yet-installed rules. Read-only: it never ' +
    'installs, edits, or enables rules.',
  schema: findPrebuiltRulesSchema,
  handler: async (input, { request }) => {
    try {
      const [coreStart, startPlugins] = await getStartServices();
      const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
      const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);

      const installedRuleVersionsMap = await fetchInstalledRuleVersionsMap(rulesClient);

      const additionalFieldsToFetch = input.fields ?? [];
      const fieldsToFetch = [...DEFAULT_FIELDS_TO_FETCH, ...additionalFieldsToFetch];

      const { rules: partialRules, total } = await getInstallableRulesForReview({
        ruleAssetsClient,
        logger,
        mlAuthz: permissiveMlAuthz,
        installedRuleVersionsMap,
        filter: buildPrebuiltRulesToolFilter(input.filter),
        sort: input.sort ? [{ field: input.sort.field, order: input.sort.order }] : undefined,
        page: 1,
        perPage: input.perPage,
        fields: fieldsToFetch,
      });

      // Reduce `threat` fields to tactics unless the caller explicitly requested the full `threat` via `fields`.
      // This helps keep the response size small.
      const rules = additionalFieldsToFetch.includes('threat')
        ? partialRules
        : partialRules.map(reduceMitreToTacticsOnly);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              total,
              rules,
            },
          },
        ],
      };
    } catch (error) {
      logger.error(
        `find_prebuilt_rules tool failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to find prebuilt rules: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
