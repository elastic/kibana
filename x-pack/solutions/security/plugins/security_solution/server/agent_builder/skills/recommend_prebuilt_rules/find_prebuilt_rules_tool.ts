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
import { fullyEscapeKQLStringParam, prepareKQLStringParam } from '../../../../common/utils/kql';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import type { PrebuiltRuleAssetsSort } from '../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route.gen';
import { createPrebuiltRuleAssetsClient } from '../../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../../lib/detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { getInstallableRulesForReview } from '../../../lib/detection_engine/prebuilt_rules/logic/get_installable_rules_for_review';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_type';
import type { MlAuthz } from '../../../lib/machine_learning/authz';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

export const FIND_PREBUILT_RULES_INLINE_TOOL_ID = 'security.find_prebuilt_rules';

const SEVERITY_VALUES = ['critical', 'high', 'medium', 'low'] as const;
const RULE_TYPE_VALUES = [
  'query',
  'eql',
  'esql',
  'threshold',
  'machine_learning',
  'new_terms',
  'threat_match',
  'saved_query',
] as const;
const FIELD_VALUES = [
  'description',
  'query',
  'mitre',
  'related_integrations',
  'index',
  'note',
  'references',
  'false_positives',
  'investigation_fields',
] as const;
const SORT_FIELDS = ['name', 'risk_score', 'severity'] as const;

const MAX_STRING_LENGTH = 10_000;
const MAX_TAG_LENGTH = 1000;
const MAX_RULE_IDS = 50;

export const findPrebuiltRulesSchema = z
  .object({
    searchTerm: z
      .string()
      .min(1)
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Free-text keyword search over rule name and description. Multiple words are ANDed ' +
          '(all must appear in the same field). Case-insensitive; no wildcards; no relevance ' +
          'ranking. For categorical queries — Windows, endpoint, LLM, Initial Access — use the ' +
          'structured filters (tags, mitreTactic, etc.); they are more precise.'
      ),
    severity: z
      .array(z.enum(SEVERITY_VALUES))
      .optional()
      .describe('Severity levels to include (OR). E.g. ["critical", "high"].'),
    ruleType: z
      .array(z.enum(RULE_TYPE_VALUES))
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
    excludeTags: z
      .array(z.string().min(1).max(MAX_TAG_LENGTH))
      .optional()
      .describe('Exclude rules with any of these tags.'),
    mitreTechnique: z
      .string()
      .regex(/^T\d{4}(\.\d{3})?$/i)
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('MITRE technique ID, e.g. "T1059" or "T1059.001".'),
    mitreTactic: z
      .string()
      .min(1)
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'MITRE tactic, either ID (e.g. "TA0001") or display name (e.g. "Initial Access"). ' +
          'Queries the structured threat field, so it finds rules whose tactic is in rule ' +
          'metadata even when no "Tactic: X" tag is present. Prefer IDs.'
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
          'follow-up to fetch finalists; omit other filters when using it. Already-installed ' +
          'IDs return nothing (this tool only sees not-yet-installed rules).'
      ),
    fields: z
      .array(z.enum(FIELD_VALUES))
      .optional()
      .describe(
        'Opt into deeper per-rule detail beyond the default triage fields. Omit for the compact ' +
          'triage shape (rule_id, name, severity, risk_score, tags, mitre tactics, ' +
          'related_integrations.package).'
      ),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe(
        'Number of results to return (default 10, max 50). Keep the default unless the user ' +
          'explicitly asks for a specific count. Never increase it on follow-up turns just ' +
          'because a previous result was truncated — narrow the filter instead.'
      ),
    sortField: z
      .enum(SORT_FIELDS)
      .optional()
      .describe(
        'Field to sort by. Use `severity`/`risk_score` for "most severe"/"highest risk" queries.'
      ),
    sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort direction (default desc).'),
  })
  .strict();

type FindPrebuiltRulesInput = z.infer<typeof findPrebuiltRulesSchema>;

// ---- Filter building ----
//
// Builds a single KQL string over the `security-rule` saved-object attributes from the
// structured params. Different params are ANDed together; array params are ORed within
// the same field. Enum- and regex-constrained values (severity, ruleType, MITRE IDs) are
// emitted unquoted; free-form values (tags, tactic name, packages, rule IDs) are quoted
// and escaped.

const field = (name: string): string => `${PREBUILT_RULE_ASSETS_SO_TYPE}.${name}`;

const NAME_FIELD = field('name');
const DESCRIPTION_FIELD = field('description');
const SEVERITY_FIELD = field('severity');
const TYPE_FIELD = field('type');
const TAGS_FIELD = field('tags');
const TACTIC_ID_FIELD = field('threat.tactic.id');
const TACTIC_NAME_FIELD = field('threat.tactic.name');
const TECHNIQUE_ID_FIELD = field('threat.technique.id');
const SUBTECHNIQUE_ID_FIELD = field('threat.technique.subtechnique.id');
const RELATED_INTEGRATIONS_PACKAGE_FIELD = field('related_integrations.package');
const RULE_ID_FIELD = field('rule_id');

const buildSearchTermClause = (searchTerm: string): string | undefined => {
  const tokens = searchTerm
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => fullyEscapeKQLStringParam(token));

  if (tokens.length === 0) {
    return undefined;
  }

  const value = tokens.length === 1 ? tokens[0] : `(${tokens.join(' AND ')})`;
  return `(${NAME_FIELD}: ${value} OR ${DESCRIPTION_FIELD}: ${value})`;
};

export const buildPrebuiltRulesToolFilter = (
  params: Pick<
    FindPrebuiltRulesInput,
    | 'searchTerm'
    | 'severity'
    | 'ruleType'
    | 'tags'
    | 'excludeTags'
    | 'mitreTechnique'
    | 'mitreTactic'
    | 'relatedIntegrations'
    | 'ruleIds'
  >
): string | undefined => {
  const parts: string[] = [];

  if (params.searchTerm) {
    const clause = buildSearchTermClause(params.searchTerm);
    if (clause) {
      parts.push(clause);
    }
  }

  if (params.severity?.length) {
    parts.push(`${SEVERITY_FIELD}: (${params.severity.join(' OR ')})`);
  }

  if (params.ruleType?.length) {
    parts.push(`${TYPE_FIELD}: (${params.ruleType.join(' OR ')})`);
  }

  if (params.tags?.length) {
    const tagClauses = params.tags.map((tag) => `${TAGS_FIELD}: ${prepareKQLStringParam(tag)}`);
    parts.push(tagClauses.length === 1 ? tagClauses[0] : `(${tagClauses.join(' OR ')})`);
  }

  if (params.excludeTags?.length) {
    const excludeClauses = params.excludeTags.map(
      (tag) => `NOT ${TAGS_FIELD}: ${prepareKQLStringParam(tag)}`
    );
    parts.push(excludeClauses.join(' AND '));
  }

  if (params.mitreTechnique) {
    const techniqueField = params.mitreTechnique.includes('.')
      ? SUBTECHNIQUE_ID_FIELD
      : TECHNIQUE_ID_FIELD;
    parts.push(`${techniqueField}: ${params.mitreTechnique}`);
  }

  if (params.mitreTactic) {
    if (/^TA\d{4}$/i.test(params.mitreTactic)) {
      parts.push(`${TACTIC_ID_FIELD}: ${params.mitreTactic}`);
    } else {
      parts.push(`${TACTIC_NAME_FIELD}: ${prepareKQLStringParam(params.mitreTactic)}`);
    }
  }

  if (params.relatedIntegrations?.length) {
    const packages = params.relatedIntegrations.map((pkg) => prepareKQLStringParam(pkg));
    parts.push(`${RELATED_INTEGRATIONS_PACKAGE_FIELD}: (${packages.join(' OR ')})`);
  }

  if (params.ruleIds?.length) {
    const ids = params.ruleIds.map((id) => prepareKQLStringParam(id));
    parts.push(`${RULE_ID_FIELD}: (${ids.join(' OR ')})`);
  }

  return parts.length > 0 ? parts.join(' AND ') : undefined;
};

// ---- Response shaping ----

// Top-level `security-rule` attribute keys fetched from ES for the default triage shape.
const TRIAGE_TOP_LEVEL_FIELDS = [
  'severity',
  'risk_score',
  'tags',
  'threat',
  'related_integrations',
] as const;

// Maps the tool's opt-in `fields` enum to the underlying top-level rule attribute key.
const DEEP_FIELD_TO_ATTRIBUTE: Record<(typeof FIELD_VALUES)[number], string> = {
  description: 'description',
  query: 'query',
  mitre: 'threat',
  related_integrations: 'related_integrations',
  index: 'index',
  note: 'note',
  references: 'references',
  false_positives: 'false_positives',
  investigation_fields: 'investigation_fields',
};

const MITRE_ATTACK_FRAMEWORK = 'MITRE ATT&CK';

/**
 * Trims a projected rule down to the compact triage shape. Codes defensively for the ~9%
 * of catalog rules with empty `threat`/`related_integrations` — those become empty arrays,
 * not errors (the LLM treats them as "unknown runnability").
 */
export const summarizeForTriage = (rule: RuleResponse) => {
  const threat = rule.threat ?? [];
  const relatedIntegrations = rule.related_integrations ?? [];

  return {
    rule_id: rule.rule_id,
    name: rule.name,
    severity: rule.severity,
    risk_score: rule.risk_score,
    tags: rule.tags ?? [],
    mitre: threat
      .filter((entry) => entry.framework === MITRE_ATTACK_FRAMEWORK)
      .map((entry) => ({ tactic: { id: entry.tactic?.id, name: entry.tactic?.name } })),
    related_integrations: relatedIntegrations.map((integration) => ({
      package: integration.package,
    })),
  };
};

const buildResponseMessage = ({
  total,
  shown,
  hasTagFilter,
}: {
  total: number;
  shown: number;
  hasTagFilter: boolean;
}): string => {
  if (total === 0) {
    return hasTagFilter
      ? 'No installable prebuilt rules matched the filter. The filter included tag values that may ' +
          'not exist in the installable catalog. Call `security.get_installable_catalog_overview` to ' +
          'list available tag values.'
      : 'No installable prebuilt rules matched the filter. Consider broadening the filter, or call ' +
          '`security.get_installable_catalog_overview` to explore the catalog.';
  }

  if (total > shown) {
    return (
      `Found ${total} installable prebuilt rules, showing top ${shown}. ` +
      'Narrow the filter (severity, rule type, tag, or MITRE) to see more specific results.'
    );
  }

  return `Found ${total} installable prebuilt rules.`;
};

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
    'Search the catalog of installable (not-yet-installed, non-deprecated) Elastic prebuilt ' +
    'detection rules using structured filters. Returns a compact triage shape per rule by ' +
    'default — rule_id, name, severity, risk_score, tags, MITRE tactics, and ' +
    'related_integrations.package — plus the total match count. Use `related_integrations.package` ' +
    'against the cached user inventory to reason about which rules can run on the deployment. ' +
    'Opt into deeper detail (description, query, full MITRE, etc.) via `fields`, and deep-fetch ' +
    'specific rules via `ruleIds`. ' +
    'Before any call that uses a `tags` filter, call `security.get_installable_catalog_overview` ' +
    'in the same turn to enumerate valid tag values and avoid tag hallucination. ' +
    'For currently-installed rules use the `find-security-rules` skill instead — this tool only ' +
    'sees rules that are not yet installed. Read-only: it never installs, edits, or enables rules.',
  schema: findPrebuiltRulesSchema,
  handler: async (input, { request }) => {
    try {
      const [coreStart, startPlugins] = await getStartServices();
      const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

      const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
      const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

      const installedRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
      const installedRuleVersionsMap = new Map(installedRuleVersions.map((v) => [v.rule_id, v]));

      const kqlFilter = buildPrebuiltRulesToolFilter(input);
      const { perPage, sortField, sortOrder } = input;
      const sort: PrebuiltRuleAssetsSort | undefined = sortField
        ? [{ field: sortField, order: sortOrder }]
        : undefined;

      const deepFields = input.fields ?? [];
      const hasDeepFields = deepFields.length > 0;
      const projectionFields = hasDeepFields
        ? Array.from(
            new Set([
              ...TRIAGE_TOP_LEVEL_FIELDS,
              ...deepFields.map((toolField) => DEEP_FIELD_TO_ATTRIBUTE[toolField]),
            ])
          )
        : [...TRIAGE_TOP_LEVEL_FIELDS];

      const { rules: projectedRules, total } = await getInstallableRulesForReview({
        ruleAssetsClient,
        logger,
        mlAuthz: permissiveMlAuthz,
        installedRuleVersionsMap,
        filter: kqlFilter,
        sort,
        page: 1,
        perPage,
        fields: projectionFields,
      });

      // When deep fields are requested, return the projected RuleResponse as-is; otherwise
      // trim to the compact triage shape.
      const rules = hasDeepFields ? projectedRules : projectedRules.map(summarizeForTriage);
      const hasTagFilter = Boolean(input.tags?.length);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: buildResponseMessage({ total, shown: rules.length, hasTagFilter }),
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
