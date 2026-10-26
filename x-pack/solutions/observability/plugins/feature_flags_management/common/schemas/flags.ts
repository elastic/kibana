/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { LIMITS } from '../constants';
import {
  appKeySchema,
  descriptionSchema,
  environmentKeySchema,
  flagKeySchema,
  nameSchema,
  pageQuerySchema,
  paginationSchema,
  timestampsSchema,
  versionSchema,
} from './common';

export const VALUE_TYPES = ['boolean', 'string', 'number'] as const;
export const MATCH_OPERATORS = [
  'in',
  'not_in',
  'semver_lt',
  'semver_gt',
  'semver_lte',
  'semver_gte',
] as const;
export const SEMVER_OPERATORS: ReadonlyArray<MatchOperator> = [
  'semver_lt',
  'semver_gt',
  'semver_lte',
  'semver_gte',
];

export type ValueType = (typeof VALUE_TYPES)[number];
export type MatchOperator = (typeof MATCH_OPERATORS)[number];
export type VariationValue = string | number | boolean;

/**
 * Serves `return` when the context attribute matches, or evaluates the nested `rules`
 * (combined with AND) when it does. Exactly one of `return` and `rules` must be set.
 */
export interface MatchRule {
  type: 'match';
  attribute: string;
  operator: MatchOperator;
  values: VariationValue[];
  return?: VariationValue;
  rules?: Rule[];
}

/**
 * Splits traffic across variations, bucketing on the value of `per_attribute`.
 * `percentages` is keyed by `String(variation)` and must sum to 100.
 */
export interface PercentageRule {
  type: 'percentage';
  per_attribute: string;
  percentages: Record<string, number>;
}

export type Rule = MatchRule | PercentageRule;

export const valueTypeSchema = lazySchema(() => z.enum(VALUE_TYPES));
export const matchOperatorSchema = lazySchema(() => z.enum(MATCH_OPERATORS));

export const variationValueSchema = lazySchema(() =>
  z.union([z.string().max(LIMITS.stringValueMaxLength), z.number(), z.boolean()])
);

export const attributeSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(LIMITS.attributeMaxLength)
    .describe('Evaluation context attribute, for example `kibana.version`.')
);

/**
 * Not wrapped in `lazySchema`: the recursion and the OAS component `id` need a single,
 * stable instance. `z.lazy` already defers building the rule variants until first use.
 */
export const ruleSchema: z.ZodType<Rule> = z
  .lazy(() =>
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('match'),
        attribute: attributeSchema,
        operator: matchOperatorSchema,
        values: z.array(variationValueSchema).min(1).max(LIMITS.maxMatchValues),
        return: variationValueSchema.optional(),
        rules: z.array(ruleSchema).max(LIMITS.maxRulesPerLevel).optional(),
      }),
      z.object({
        type: z.literal('percentage'),
        per_attribute: attributeSchema,
        percentages: z
          .record(z.string().max(LIMITS.stringValueMaxLength), z.number().int().min(0).max(100))
          .refine((percentages) => Object.keys(percentages).length <= LIMITS.maxVariations, {
            message: `percentages accepts at most ${LIMITS.maxVariations} entries`,
          })
          .describe('Percentage of traffic per variation, keyed by the variation as a string.'),
      }),
    ])
  )
  .meta({ id: 'FeatureFlagsRule' });

export const prerequisiteSchema = lazySchema(() =>
  z.object({
    flag: flagKeySchema,
    value: variationValueSchema.describe('Variation the prerequisite flag must serve.'),
  })
);

export const environmentRuleSetSchema = lazySchema(() =>
  z.object({
    default: variationValueSchema.describe('Variation served when no rule matches.'),
    prerequisites: z.array(prerequisiteSchema).max(LIMITS.maxPrerequisites).optional(),
    rules: z
      .array(ruleSchema)
      .max(LIMITS.maxRulesPerLevel)
      .optional()
      .describe('Evaluated in order; the first match wins.'),
  })
);

export const tagSchema = lazySchema(() => z.string().trim().min(1).max(LIMITS.tagMaxLength));
export const teamOwnerSchema = lazySchema(() =>
  z.string().trim().min(1).max(LIMITS.teamOwnerMaxLength)
);

export const flagDefinitionSchema = lazySchema(() =>
  z.object({
    key: flagKeySchema,
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    value_type: valueTypeSchema,
    variations: z.array(variationValueSchema).min(LIMITS.minVariations).max(LIMITS.maxVariations),
    apps: z
      .array(appKeySchema)
      .min(1)
      .max(LIMITS.maxApps)
      .describe('Apps that can evaluate this flag.'),
    team_owner: teamOwnerSchema,
    deprecate_by: z.string().max(LIMITS.deprecateByMaxLength).optional(),
    tags: z.array(tagSchema).max(LIMITS.maxTags).default([]),
    environments: z
      .record(environmentKeySchema, environmentRuleSetSchema)
      .refine((environments) => Object.keys(environments).length <= LIMITS.maxEnvironments, {
        message: `environments accepts at most ${LIMITS.maxEnvironments} entries`,
      })
      .default({})
      .describe('Evaluation rules per environment key. A flag is only served where configured.'),
  })
);

export const createFlagRequestSchema = flagDefinitionSchema;

export const updateFlagRequestSchema = lazySchema(() =>
  flagDefinitionSchema.omit({ key: true }).extend({ version: versionSchema.optional() })
);

export const flagParamsSchema = lazySchema(() => z.object({ key: flagKeySchema }));

export const flagSchema = lazySchema(() => flagDefinitionSchema.extend(timestampsSchema.shape));

export const listFlagsQuerySchema = lazySchema(() =>
  z.object({
    app: appKeySchema.optional(),
    environment: environmentKeySchema
      .optional()
      .describe('Only flags with evaluation rules for this environment.'),
    tag: tagSchema.optional(),
    team_owner: teamOwnerSchema.optional(),
    search: z
      .string()
      .max(LIMITS.searchMaxLength)
      .optional()
      .describe('Case-insensitive substring match on the flag key and name.'),
    page: pageQuerySchema,
    per_page: z.coerce.number().int().min(1).max(LIMITS.maxPerPage).default(20),
  })
);

export const listFlagsResponseSchema = lazySchema(() =>
  z.object({ items: z.array(flagSchema) }).extend(paginationSchema.shape)
);

export const flagHistoryQuerySchema = lazySchema(() =>
  z.object({
    page: pageQuerySchema,
    per_page: z.coerce.number().int().min(1).max(LIMITS.historyMaxPerPage).default(20),
  })
);

/**
 * Snapshots can come from older or newer Kibana versions, so every field is optional
 * and unknown fields are kept.
 */
export const flagSnapshotSchema = lazySchema(() =>
  z.looseObject({
    ...flagDefinitionSchema.partial().shape,
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
);

export const flagHistoryItemSchema = lazySchema(() =>
  z.object({
    id: z.string().describe('Change history event ID.'),
    timestamp: z.string(),
    action: z.string(),
    event_type: z.enum(['creation', 'change', 'deletion']),
    user: z.object({
      name: z.string(),
      id: z.string().optional(),
      full_name: z.string().optional(),
    }),
    snapshot: flagSnapshotSchema.describe('The flag after the change.'),
  })
);

export const flagHistoryResponseSchema = lazySchema(() =>
  z.object({ items: z.array(flagHistoryItemSchema) }).extend(paginationSchema.shape)
);

export type Prerequisite = z.infer<typeof prerequisiteSchema>;
export type EnvironmentRuleSet = z.infer<typeof environmentRuleSetSchema>;
export type FlagDefinition = z.infer<typeof flagDefinitionSchema>;
export type CreateFlagRequest = z.input<typeof createFlagRequestSchema>;
export type UpdateFlagRequest = z.input<typeof updateFlagRequestSchema>;
export type Flag = z.infer<typeof flagSchema>;
export type ListFlagsQuery = z.input<typeof listFlagsQuerySchema>;
export type ListFlagsResponse = z.infer<typeof listFlagsResponseSchema>;
export type FlagHistoryQuery = z.input<typeof flagHistoryQuerySchema>;
export type FlagSnapshot = z.infer<typeof flagSnapshotSchema>;
export type FlagHistoryItem = z.infer<typeof flagHistoryItemSchema>;
export type FlagHistoryResponse = z.infer<typeof flagHistoryResponseSchema>;
