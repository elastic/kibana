/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

const ID_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;
/** ECS-style field names; a leading `@` allows `@timestamp`. */
const FIELD_PATTERN = /^@?[a-zA-Z_][a-zA-Z0-9_.*]*$/;
const TIME_RANGE_PATTERN = /^[a-zA-Z0-9:\-+/]+$/;
const PLACEHOLDER_PATTERN = /\{\{param\.([^{}\s]+)\}\}/g;

export const HUNT_PLATFORMS = [
  'windows',
  'linux',
  'macos',
  'cloud',
  'identity',
  'network',
] as const;
export const OCCURRENCE_BUCKETS = ['15m', '1h', '1d'] as const;
/** Binds the runner supplies to a surrounding-event query besides the occurrence key fields. */
export const SURROUNDING_BIND_PARAMS = ['bucket_start', 'bucket_end', 'group_id'] as const;

const uniqueStrings = <T extends z.ZodType<string>>(item: T, min: number, max: number) =>
  z
    .array(item)
    .min(min)
    .max(max)
    .refine((values) => new Set(values).size === values.length, {
      message: 'entries must be unique',
    });

const field = lazySchema(() => z.string().min(1).max(256).regex(FIELD_PATTERN));
const fieldList = (min: number, max: number) => uniqueStrings(field, min, max);
const noteList = lazySchema(() => uniqueStrings(z.string().min(1).max(1024), 0, 20));

const timeRangeBound = lazySchema(() => z.string().min(1).max(64).regex(TIME_RANGE_PATTERN));

/** Names referenced as `{{param.<name>}}` in a surrounding-event query, in order of appearance. */
export const extractSurroundingPlaceholders = (query: string): string[] =>
  [...query.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]);

const querySchema = lazySchema(() =>
  z
    .object({
      id: z.string().regex(ID_PATTERN),
      language: z.literal('esql'),
      query: z.string().min(1).max(20000),
      resultKind: z.enum(['raw_event', 'aggregate']),
      defaultTimeRange: z.object({ from: timeRangeBound, to: timeRangeBound }).strict(),
      recommendedColumns: fieldList(1, 30),
      requiredIndexPatterns: uniqueStrings(z.string().min(1).max(256), 1, 16),
      requiredFields: fieldList(1, 30),
      evidenceFields: fieldList(1, 30),
      adjudicationFields: fieldList(1, 30),
      surroundingEventQuery: z.string().min(1).max(20000).optional(),
      occurrence: z
        .object({
          keyFields: fieldList(1, 8),
          timeField: field,
          bucket: z.enum(OCCURRENCE_BUCKETS),
        })
        .strict(),
    })
    .strict()
    .superRefine((query, ctx) => {
      const issue = (path: Array<string | number>, message: string) =>
        ctx.addIssue({ code: 'custom', path, message });

      if (!/^\s*FROM\s/i.test(query.query)) {
        issue(['query'], 'query must start with FROM');
      }
      if (query.query.includes('{{')) {
        issue(['query'], 'the candidate query cannot contain placeholders');
      }
      const columns = new Set(query.recommendedColumns);
      for (const key of query.occurrence.keyFields) {
        if (!columns.has(key)) {
          issue(['occurrence', 'keyFields'], `key field "${key}" must be a recommended column`);
        }
      }
      if (!columns.has(query.occurrence.timeField)) {
        issue(['occurrence', 'timeField'], 'time field must be a recommended column');
      }
      if (query.resultKind === 'raw_event') {
        for (const required of ['_index', '_id']) {
          if (!columns.has(required)) {
            issue(['recommendedColumns'], `raw event queries must return ${required}`);
          }
        }
      }
      if (query.resultKind === 'aggregate' && !query.surroundingEventQuery) {
        issue(['surroundingEventQuery'], 'aggregate queries require a surrounding event query');
      }
      if (query.surroundingEventQuery) {
        const allowed = new Set<string>([
          ...query.occurrence.keyFields,
          ...SURROUNDING_BIND_PARAMS,
        ]);
        for (const name of extractSurroundingPlaceholders(query.surroundingEventQuery)) {
          if (!allowed.has(name)) {
            issue(
              ['surroundingEventQuery'],
              `placeholder "{{param.${name}}}" is not a key field or allowed bind`
            );
          }
        }
        const stripped = query.surroundingEventQuery.replace(PLACEHOLDER_PATTERN, '');
        if (stripped.includes('{{') || stripped.includes('}}')) {
          issue(['surroundingEventQuery'], 'malformed placeholder');
        }
        if (!/^\s*FROM\s/i.test(query.surroundingEventQuery)) {
          issue(['surroundingEventQuery'], 'surrounding query must start with FROM');
        }
        if (!/\bMETADATA\b[^|\n]*\b_index\b/i.test(query.surroundingEventQuery)) {
          issue(['surroundingEventQuery'], 'surrounding query must request METADATA _index');
        }
        if (!/\bMETADATA\b[^|\n]*\b_id\b/i.test(query.surroundingEventQuery)) {
          issue(['surroundingEventQuery'], 'surrounding query must request METADATA _id');
        }
        if (
          !/\|\s*KEEP\b[^|]*\b_index\b[^|]*\b_id\b|\|\s*KEEP\b[^|]*\b_id\b[^|]*\b_index\b/i.test(
            query.surroundingEventQuery
          )
        ) {
          issue(['surroundingEventQuery'], 'surrounding query must keep _index and _id');
        }
      }
    })
);

export const HuntDefinitionSchema = lazySchema(() =>
  z
    .object({
      id: z.string().regex(ID_PATTERN),
      version: z.number().int().positive(),
      name: z.string().min(1).max(120),
      description: z.string().min(1).max(4000),
      hypothesis: z.string().min(1).max(4000),
      platform: uniqueStrings(z.enum(HUNT_PLATFORMS), 1, 8),
      mitreTechniques: uniqueStrings(z.string().regex(/^T\d{4}(\.\d{3})?$/), 0, 32),
      references: uniqueStrings(z.string().url().max(2048), 0, 20),
      guidance: z
        .object({
          analystNotes: noteList,
          expectedFalsePositives: noteList,
          suggestedPivots: noteList,
        })
        .strict(),
      query: querySchema,
      source: z
        .object({
          kind: z.literal('elastic_seed'),
          tradeId: z.string().min(1).max(128),
          path: z.string().min(1).max(512),
          revision: z.string().min(1).max(128),
        })
        .strict(),
    })
    .strict()
);

export type HuntDefinition = z.infer<typeof HuntDefinitionSchema>;
export type HuntQuery = HuntDefinition['query'];

export const parseHuntDefinition = (input: unknown): HuntDefinition =>
  HuntDefinitionSchema.parse(input);
