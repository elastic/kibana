/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { z, lazySchema } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { StartPlugins } from '../../../plugin_contract';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';
import {
  PARAMS_IMMUTABLE_FIELD,
  PARAMS_TYPE_FIELD,
  TAGS_FIELD,
} from '../../../../common/detection_engine/rule_management/rule_fields';
import { RuleSetsClient } from '../../../lib/detection_engine/rule_sets/logic/rule_sets_client';
import { buildConditionsFilter } from '../../../lib/detection_engine/rule_sets/logic/build_rule_set_filter';

export const RULE_SETS_INVENTORY_TOOL_ID = 'security.rule_sets.get_inventory';
export const RULE_SETS_PROPOSE_TOOL_ID = 'security.rule_sets.propose';

const INTEGRATION_FIELD = 'alert.attributes.params.relatedIntegrations.package';
const TACTIC_FIELD = 'alert.attributes.params.threat.tactic.name';
const SEVERITY_FIELD = 'alert.attributes.params.severity';

/** Only aggregates go to the model: the size of the answer does not grow with the number of rules. */
const MAX_TAGS = 150;
const MAX_CUSTOM_RULES_READ = 1000;
const NAMES_PER_TAG = 5;
const MAX_SAMPLE_NAMES = 200;

type GetStartServices = StartServicesAccessor<StartPlugins>;

interface Bucket {
  key: string | number;
  doc_count: number;
}

const termsAgg = (field: string, size = 1000) => ({ terms: { field, size } });

const toCounts = (aggs: Record<string, unknown> | undefined, name: string) =>
  ((aggs?.[name] as { buckets?: Bucket[] } | undefined)?.buckets ?? []).map(
    ({ key, doc_count: rules }) => ({ value: String(key), rules })
  );

const createClient = async (getStartServices: GetStartServices, context: ToolHandlerContext) => {
  const [coreStart, startPlugins] = await getStartServices();
  const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(context.request);
  const user = coreStart.security.authc.getCurrentUser(context.request);
  return {
    rulesClient,
    startPlugins,
    ruleSets: new RuleSetsClient(context.savedObjectsClient, rulesClient, user?.profile_uid),
  };
};

const errorResult = (message: string) => ({
  results: [{ type: ToolResultType.error, data: { message } }],
});

/** The same conditions in any order are the same set. */
const normalize = (conditions: RuleSetConditions) =>
  Object.fromEntries(
    Object.entries(conditions)
      .filter(
        ([, value]) => value != null && value !== '' && !(Array.isArray(value) && !value.length)
      )
      .map(([key, value]) => [key, Array.isArray(value) ? [...value].sort() : value])
  );

export const ruleSetsInventoryTool = (
  getStartServices: GetStartServices
): BuiltinSkillBoundedTool => ({
  id: RULE_SETS_INVENTORY_TOOL_ID,
  type: ToolType.builtin,
  description: `Returns an overview of the detection rules installed in the current space: counts of rules per tag, integration, MITRE ATT&CK tactic, rule type, severity and source (Elastic or custom), the installed integrations, sample names of custom rules per custom tag, and the rule sets that already exist. Call it once before you suggest rule sets.`,
  schema: z.object({}),
  handler: async (_args, context) => {
    try {
      const { rulesClient, startPlugins, ruleSets } = await createClient(getStartServices, context);

      const [all, custom, customRules, existing, installed] = await Promise.all([
        findRules({
          rulesClient,
          filter: undefined,
          page: 1,
          perPage: 0,
          sortField: undefined,
          sortOrder: undefined,
          aggregations: {
            tags: termsAgg(TAGS_FIELD),
            integrations: termsAgg(INTEGRATION_FIELD),
            tactics: termsAgg(TACTIC_FIELD),
            rule_types: termsAgg(PARAMS_TYPE_FIELD),
            severities: termsAgg(SEVERITY_FIELD),
            source: termsAgg(PARAMS_IMMUTABLE_FIELD),
          },
        }),
        findRules({
          rulesClient,
          filter: `${PARAMS_IMMUTABLE_FIELD}: false`,
          page: 1,
          perPage: 0,
          sortField: undefined,
          sortOrder: undefined,
          aggregations: { tags: termsAgg(TAGS_FIELD) },
        }),
        findRules({
          rulesClient,
          filter: `${PARAMS_IMMUTABLE_FIELD}: false`,
          page: 1,
          perPage: MAX_CUSTOM_RULES_READ,
          sortField: 'name',
          sortOrder: 'asc',
          fields: ['name', 'tags'],
        }),
        ruleSets.find({ withCounts: false }),
        // The user can lack Fleet privileges: then the agent works without this list.
        startPlugins.fleet?.packageService
          .asScoped(context.request)
          .getInstalledPackages({ perPage: 1000, sortOrder: 'asc' })
          .then(({ items }) => items.map(({ name, title }) => ({ name, title })))
          .catch(() => undefined),
      ]);

      const source = toCounts(all.aggregations, 'source');
      const customTagCounts = new Map(
        toCounts(custom.aggregations, 'tags').map(({ value, rules }) => [value, rules])
      );

      // A few names per custom tag tell the model what a customer's own tag means.
      const samples = new Map<string, string[]>();
      let sampleNames = 0;
      for (const rule of customRules.data) {
        for (const tag of rule.tags) {
          const names = samples.get(tag) ?? [];
          if (names.length < NAMES_PER_TAG && sampleNames < MAX_SAMPLE_NAMES) {
            names.push(rule.name);
            samples.set(tag, names);
            sampleNames++;
          }
        }
      }

      const tags = toCounts(all.aggregations, 'tags');
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              total_rules: all.total,
              elastic_rules:
                source.find(({ value }) => value === 'true' || value === '1')?.rules ?? 0,
              custom_rules:
                source.find(({ value }) => value === 'false' || value === '0')?.rules ?? 0,
              tags: tags.slice(0, MAX_TAGS).map(({ value, rules }) => ({
                value,
                rules,
                custom_rules: customTagCounts.get(value) ?? 0,
                ...(samples.has(value) && { sample_custom_rule_names: samples.get(value) }),
              })),
              tags_not_shown: Math.max(0, tags.length - MAX_TAGS),
              integrations: toCounts(all.aggregations, 'integrations'),
              installed_integrations: installed,
              tactics: toCounts(all.aggregations, 'tactics'),
              rule_types: toCounts(all.aggregations, 'rule_types'),
              severities: toCounts(all.aggregations, 'severities'),
              existing_rule_sets: existing.map((set) => ({
                name: set.name,
                visibility: set.visibility,
                conditions: set.conditions,
                picked_rules: set.included_rule_ids.length,
              })),
            },
          },
        ],
      };
    } catch (error) {
      return errorResult(`Could not read the rules: ${error.message}`);
    }
  },
});

const conditionsSchema = lazySchema(() =>
  z.object({
    tags: z
      .array(z.string())
      .optional()
      .describe(
        'Exact tag values. A rule must have ALL of these tags, same as the rules table tag filter.'
      ),
    integrations: z
      .array(z.string())
      .optional()
      .describe(
        'Integration package names, for example "endpoint" or "aws". A rule matches ANY of them.'
      ),
    rule_types: z
      .array(
        z.enum([
          'query',
          'saved_query',
          'eql',
          'esql',
          'threshold',
          'threat_match',
          'machine_learning',
          'new_terms',
        ])
      )
      .optional()
      .describe('A rule matches ANY of these rule types.'),
    severities: z
      .array(z.enum(['low', 'medium', 'high', 'critical']))
      .optional()
      .describe('A rule matches ANY of these severities.'),
    source: z
      .enum(['elastic', 'custom'])
      .optional()
      .describe('"elastic" for Elastic prebuilt rules, "custom" for rules the customer wrote.'),
    search: z
      .string()
      .optional()
      .describe(
        'Free text, the same as the search field of the rules table. Use it only when tags cannot express the set.'
      ),
  })
);

const proposeSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(80)
      .describe('Short name of the rule set, for example "Team: SOC EU".'),
    reason: z
      .string()
      .min(1)
      .max(300)
      .describe('One sentence for the user: why this set is useful for them.'),
    conditions: conditionsSchema.describe(
      'The conditions of the set. All given conditions must match (AND). Use only values from the inventory.'
    ),
  })
);

export const ruleSetsProposeTool = (
  getStartServices: GetStartServices
): BuiltinSkillBoundedTool => ({
  id: RULE_SETS_PROPOSE_TOOL_ID,
  type: ToolType.builtin,
  description: `Proposes one rule set to the user. It counts the rules that match the conditions, checks that the same set does not exist yet, and stores the proposal as an attachment that the user can create with one click. It does not create the rule set. Call it once for each suggestion. Render each returned attachment with <render_attachment id="..." version="...">.`,
  schema: proposeSchema,
  handler: async (args, context) => {
    const { name, reason, conditions } = args as z.infer<typeof proposeSchema>;
    try {
      const filter = buildConditionsFilter(conditions);
      if (!filter) {
        return errorResult('A rule set needs at least one condition.');
      }
      const { rulesClient, ruleSets } = await createClient(getStartServices, context);
      const [matching, existing] = await Promise.all([
        findRules({
          rulesClient,
          filter: undefined,
          kueryFilter: filter,
          page: 1,
          perPage: 0,
          sortField: undefined,
          sortOrder: undefined,
        }),
        ruleSets.find({ withCounts: false }),
      ]);
      if (matching.total === 0) {
        return errorResult(
          `No rules match these conditions. Check the values against the inventory: ${JSON.stringify(
            conditions
          )}`
        );
      }

      const same = existing.find(
        (set) =>
          !set.included_rule_ids.length && isEqual(normalize(set.conditions), normalize(conditions))
      );

      const attachment = await context.attachments.add({
        type: SecurityAgentBuilderAttachments.ruleSet,
        data: {
          attachmentLabel: name,
          name,
          reason,
          conditions,
          rules_count: matching.total,
          ...(same && { existing_rule_set: { id: same.id, name: same.name } }),
        },
        description: `Suggested rule set: ${name}`,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              attachmentId: attachment.id,
              version: attachment.current_version,
              rules: matching.total,
              ...(same && { already_exists_as: same.name }),
            },
          },
        ],
      };
    } catch (error) {
      return errorResult(`Could not propose the rule set: ${error.message}`);
    }
  },
});
