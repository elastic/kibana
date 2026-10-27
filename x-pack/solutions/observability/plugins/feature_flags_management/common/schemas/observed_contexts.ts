/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { LIMITS } from '../constants';
import { appKeySchema, environmentKeySchema, pageQuerySchema, paginationSchema } from './common';
import { attributeSchema } from './flags';

const scopeQuerySchema = lazySchema(() =>
  z.object({
    app: appKeySchema,
    environment: environmentKeySchema,
  })
);

const prefixSchema = lazySchema(() =>
  z
    .string()
    .max(LIMITS.prefixMaxLength)
    .optional()
    .describe('Only suggestions that start with this prefix (case-sensitive).')
);

const suggestionsSizeSchema = lazySchema(() =>
  z.coerce.number().int().min(1).max(LIMITS.maxSuggestions).default(LIMITS.defaultSuggestions)
);

/** One app, or several. Suggestions combine the observed contexts of every app. */
const suggestionAppsSchema = lazySchema(() =>
  z
    .union([appKeySchema, z.array(appKeySchema).min(1).max(LIMITS.maxApps)])
    .describe('App key, or repeated to combine several apps.')
);

export const observedAttributesQuerySchema = lazySchema(() =>
  z.object({
    app: suggestionAppsSchema,
    environment: environmentKeySchema,
    prefix: prefixSchema,
    size: suggestionsSizeSchema,
  })
);

export const observedAttributeSchema = lazySchema(() =>
  z.object({
    name: z.string(),
    count: z.number().describe('Number of observed contexts that contain the attribute.'),
    types: z
      .array(z.string())
      .describe(
        'JSON types seen for the attribute, most frequent first, as reported by Fleet Server.'
      ),
  })
);

export const observedAttributesResponseSchema = lazySchema(() =>
  z.object({ items: z.array(observedAttributeSchema) })
);

export const observedValuesQuerySchema = lazySchema(() =>
  z.object({
    app: suggestionAppsSchema,
    environment: environmentKeySchema,
    attribute: attributeSchema,
    prefix: prefixSchema,
    size: suggestionsSizeSchema,
  })
);

export const observedValueSchema = lazySchema(() =>
  z.object({
    value: z.string().describe('Observed value, as a string.'),
    count: z.number(),
  })
);

export const observedValuesResponseSchema = lazySchema(() =>
  z.object({ items: z.array(observedValueSchema) })
);

export const listObservedContextsQuerySchema = lazySchema(() =>
  scopeQuerySchema.extend({
    context_key: z
      .string()
      .min(1)
      .max(LIMITS.contextKeyMaxLength)
      .optional()
      .describe('Look up a single context by its targeting key.'),
    page: pageQuerySchema,
    per_page: z.coerce.number().int().min(1).max(LIMITS.maxPerPage).default(20),
  })
);

export const observedContextSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    app: z.string(),
    environment: z.string(),
    context_key: z.string(),
    context: z
      .record(z.string(), z.unknown())
      .describe('The evaluation context as Fleet Server last saw it.'),
    attributes: z.array(z.string()),
    attribute_types: z.record(z.string(), z.string()),
    first_seen: z.string().optional(),
    last_seen: z.string().optional(),
  })
);

export const listObservedContextsResponseSchema = lazySchema(() =>
  z.object({ items: z.array(observedContextSchema) }).extend(paginationSchema.shape)
);

export type ObservedAttributesQuery = z.input<typeof observedAttributesQuerySchema>;
export type ObservedAttribute = z.infer<typeof observedAttributeSchema>;
export type ObservedAttributesResponse = z.infer<typeof observedAttributesResponseSchema>;
export type ObservedValuesQuery = z.input<typeof observedValuesQuerySchema>;
export type ObservedValue = z.infer<typeof observedValueSchema>;
export type ObservedValuesResponse = z.infer<typeof observedValuesResponseSchema>;
export type ListObservedContextsQuery = z.input<typeof listObservedContextsQuerySchema>;
export type ObservedContext = z.infer<typeof observedContextSchema>;
export type ListObservedContextsResponse = z.infer<typeof listObservedContextsResponseSchema>;
