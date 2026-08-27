/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  sloIndicatorSchema,
  sloBudgetingMethodSchema,
  sloTimeWindowSchema,
} from '../tools/manage_slo/schemas';

type JsonSchemaNode = Record<string, unknown>;

interface FieldInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
  constraints: string;
}

export interface DescribedEnumValue {
  value: string;
  description: string;
}

const LARGE_ENUM_THRESHOLD = 20;

export class SchemaTranslationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SchemaTranslationError';
  }
}

const throwIfNotZodUnion = (schema: z.ZodType, schemaName: string): z.ZodUnion => {
  if (!(schema instanceof z.ZodUnion)) {
    throw new SchemaTranslationError(
      `${schemaName} is not a union of described literals. Use z.union of z.literal(...).describe(...) on each value.`
    );
  }
  return schema;
};

const throwIfMissingDescribes = (missing: string[], subject: string, detail?: string): void => {
  if (missing.length === 0) {
    return;
  }
  const suffix = detail ? ` ${detail}` : '';
  throw new SchemaTranslationError(
    `Missing .describe() on ${subject}: ${missing.join(', ')}.${suffix}`
  );
};

/**
 * Generalized version of the alerting_v2 `throwIfMissingOperationDescribes`. Accepts a
 * `discriminatorKey` (default `'operation'`) so that indicator unions (key `'type'`) and
 * operation unions (key `'operation'`) can reuse the same enforcement logic.
 */
const throwIfMissingVariantDescribes = (
  variants: JsonSchemaNode[] | undefined,
  discriminatorKey: string,
  title: string
): void => {
  const missing = (variants ?? [])
    .filter(
      (variant) =>
        typeof variant.description !== 'string' || variant.description.trim().length === 0
    )
    .map((variant) => {
      const prop = (variant.properties as JsonSchemaNode | undefined)?.[discriminatorKey] as
        | JsonSchemaNode
        | undefined;
      const value = prop?.const ?? (prop?.enum as string[] | undefined)?.[0];
      return typeof value === 'string' ? value : '(unnamed variant)';
    });

  throwIfMissingDescribes(
    missing,
    `${discriminatorKey} variant(s)`,
    `Add a top-level .describe() explaining the user goal to each listed variant (${title}).`
  );
};

function compactLargeEnums(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(compactLargeEnums);

  const obj = node as JsonSchemaNode;
  const result: JsonSchemaNode = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'enum' && Array.isArray(value) && value.length > LARGE_ENUM_THRESHOLD) {
      const examples = value.slice(0, 5) as string[];
      result.type = 'string';
      result.description = [
        obj.description ?? '',
        `One of ${value.length} allowed values, e.g.: ${examples.join(', ')}`,
      ]
        .filter(Boolean)
        .join('. ');
    } else {
      result[key] = compactLargeEnums(value);
    }
  }

  return result;
}

const REF_PREFIXES = ['#/definitions/', '#/$defs/'] as const;

const COMPOSITION_KEYS = new Set(['$ref', 'allOf', 'definitions', '$defs', '$schema']);

function resolveRef(ref: string, root: JsonSchemaNode): JsonSchemaNode | undefined {
  if (ref === '#') return root;
  const prefix = REF_PREFIXES.find((candidate) => ref.startsWith(candidate));
  if (!prefix) return undefined;
  const defs = (root.definitions ?? root.$defs) as JsonSchemaNode | undefined;
  const target = defs?.[decodeURIComponent(ref.slice(prefix.length))];
  return target && typeof target === 'object' ? (target as JsonSchemaNode) : undefined;
}

function mergeSchemaNodes(base: JsonSchemaNode, override: JsonSchemaNode): JsonSchemaNode {
  const merged: JsonSchemaNode = { ...base, ...override };

  const baseProperties = base.properties as JsonSchemaNode | undefined;
  const overrideProperties = override.properties as JsonSchemaNode | undefined;
  if (baseProperties || overrideProperties) {
    merged.properties = { ...baseProperties, ...overrideProperties };
  }

  const required = [
    ...((base.required as string[]) ?? []),
    ...((override.required as string[]) ?? []),
  ];
  if (required.length > 0) merged.required = [...new Set(required)];

  return merged;
}

function inlineRefs(node: unknown, root: JsonSchemaNode, visiting: ReadonlySet<string>): unknown {
  if (Array.isArray(node)) return node.map((item) => inlineRefs(item, root, visiting));
  if (node === null || typeof node !== 'object') return node;

  const obj = node as JsonSchemaNode;
  const own: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(obj)) {
    if (COMPOSITION_KEYS.has(key)) continue;
    own[key] = inlineRefs(value, root, visiting);
  }

  const bases: JsonSchemaNode[] = [];
  const { $ref: ref, allOf } = obj;
  if (typeof ref === 'string' && !visiting.has(ref)) {
    const target = resolveRef(ref, root);
    if (target) {
      const nested = new Set(visiting).add(ref);
      bases.push(inlineRefs(target, root, nested) as JsonSchemaNode);
    }
  }
  if (Array.isArray(allOf)) {
    for (const member of allOf) {
      bases.push(inlineRefs(member, root, visiting) as JsonSchemaNode);
    }
  }

  return [...bases, own].reduce(mergeSchemaNodes, {});
}

function zodToJsonSchema(schema: z.ZodType): unknown {
  try {
    const jsonSchema = z.toJSONSchema(schema, {
      target: 'draft-7',
      unrepresentable: 'any',
    }) as JsonSchemaNode;
    return compactLargeEnums(inlineRefs(jsonSchema, jsonSchema, new Set()));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new SchemaTranslationError(
      `Failed to convert Zod schema to JSON Schema: ${message}. Check the Zod schema passed to skill-doc generation.`,
      e
    );
  }
}

function formatFieldConstraintsSummary(prop: JsonSchemaNode): string {
  const parts: string[] = [];
  if (prop.minLength !== undefined) parts.push(`min length: ${prop.minLength}`);
  if (prop.maxLength !== undefined) parts.push(`max length: ${prop.maxLength}`);
  if (prop.minimum !== undefined) parts.push(`min: ${prop.minimum}`);
  if (prop.maximum !== undefined) parts.push(`max: ${prop.maximum}`);
  if (prop.pattern !== undefined) parts.push(`pattern: ${prop.pattern}`);
  if (prop.enum !== undefined && Array.isArray(prop.enum)) {
    parts.push(`enum: ${(prop.enum as string[]).join(' | ')}`);
  }
  if (prop.minItems !== undefined) parts.push(`min items: ${prop.minItems}`);
  if (prop.maxItems !== undefined) parts.push(`max items: ${prop.maxItems}`);
  if (prop.default !== undefined) parts.push(`default: ${JSON.stringify(prop.default)}`);
  return parts.join(', ');
}

function formatTypeKeyword(type: unknown): string {
  if (Array.isArray(type)) {
    return (type as string[]).join(' | ');
  }
  return (type as string) ?? 'unknown';
}

function resolveType(prop: JsonSchemaNode): string {
  if (prop.const !== undefined) {
    return `"${prop.const}"`;
  }
  if (prop.enum !== undefined && Array.isArray(prop.enum)) {
    return (prop.enum as string[]).map((v) => `"${v}"`).join(' | ');
  }
  if (prop.anyOf !== undefined && Array.isArray(prop.anyOf)) {
    return (prop.anyOf as JsonSchemaNode[]).map(resolveType).join(' | ');
  }
  if (prop.oneOf !== undefined && Array.isArray(prop.oneOf)) {
    const variants = prop.oneOf as JsonSchemaNode[];
    if (variants.every((variant) => variant.const !== undefined)) {
      return variants.map(resolveType).join(' | ');
    }
    return variants
      .map((variant) => {
        const disc = variant.properties as JsonSchemaNode | undefined;
        if (disc) {
          const firstKey = Object.keys(disc)[0];
          const firstProp = disc[firstKey] as JsonSchemaNode | undefined;
          if (firstProp?.const) return `{ ${firstKey}: "${firstProp.const}", ... }`;
        }
        return (variant.type as string) ?? 'variant';
      })
      .join(' | ');
  }
  const types = Array.isArray(prop.type) ? (prop.type as string[]) : [prop.type as string];
  if (types.includes('array')) {
    const items = prop.items as JsonSchemaNode | undefined;
    const itemType = items ? resolveType(items) : 'unknown';
    return [`${itemType}[]`, ...types.filter((t) => t !== 'array')].join(' | ');
  }
  return formatTypeKeyword(prop.type);
}

function jsonSchemaToFieldTable(jsonSchema: unknown): FieldInfo[] {
  if (!jsonSchema || typeof jsonSchema !== 'object') return [];
  const schema = jsonSchema as JsonSchemaNode;
  const properties = schema.properties as JsonSchemaNode | undefined;
  if (!properties) return [];
  const required = new Set((schema.required as string[]) ?? []);

  return Object.entries(properties).map(([name, rawProp]) => {
    const prop = rawProp as JsonSchemaNode;
    return {
      name,
      type: resolveType(prop),
      required: required.has(name),
      description: (prop.description as string) ?? '',
      constraints: formatFieldConstraintsSummary(prop),
    };
  });
}

function escapeTableCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function formatFieldTable(fields: FieldInfo[]): string {
  if (fields.length === 0) return '';
  const rows = fields.map((f) => {
    const description = escapeTableCell(
      `${f.description}${f.constraints ? ` (${f.constraints})` : ''}`
    );
    return `| \`${f.name}\` | ${escapeTableCell(f.type)} | ${
      f.required ? 'required' : 'optional'
    } | ${description} |`;
  });
  return ['| Field | Type | Required | Description |', '|---|---|---|---|', ...rows].join('\n');
}

function formatVariantSchemas(jsonSchema: unknown): string {
  if (!jsonSchema || typeof jsonSchema !== 'object') return '';
  const schema = jsonSchema as JsonSchemaNode;
  const variants = (schema.oneOf ?? schema.anyOf) as JsonSchemaNode[] | undefined;
  if (!variants) return '';

  const sections: string[] = [];
  for (const variant of variants) {
    const props = variant.properties as JsonSchemaNode | undefined;
    if (!props) continue;

    const discriminatorKey = Object.keys(props).find((k) => {
      const p = props[k] as JsonSchemaNode;
      return p.const !== undefined || (p.enum && (p.enum as string[]).length === 1);
    });
    const discriminatorValue = discriminatorKey
      ? ((props[discriminatorKey] as JsonSchemaNode).const as string) ??
        ((props[discriminatorKey] as JsonSchemaNode).enum as string[])?.[0]
      : undefined;

    const label =
      discriminatorKey && discriminatorValue
        ? `\`${discriminatorKey}: "${discriminatorValue}"\``
        : variant.description ?? 'Variant';

    const fields = jsonSchemaToFieldTable(variant);
    if (fields.length > 0) {
      const description =
        typeof variant.description === 'string' && variant.description.trim().length > 0
          ? `${variant.description}\n\n`
          : '';
      sections.push(`#### ${label}\n\n${description}${formatFieldTable(fields)}`);
    }
  }
  return sections.join('\n\n');
}

const toVariantJsonSchema = (
  schema: z.ZodType,
  discriminatorKey: string,
  title: string
): JsonSchemaNode => {
  const jsonSchema = zodToJsonSchema(schema) as JsonSchemaNode;
  throwIfMissingVariantDescribes(
    (jsonSchema.oneOf ?? jsonSchema.anyOf) as JsonSchemaNode[] | undefined,
    discriminatorKey,
    title
  );
  return jsonSchema;
};

export const generateApiSchemaDoc = ({
  title,
  schema,
  extraSections,
}: {
  title: string;
  schema: z.ZodType;
  extraSections?: (jsonSchema: unknown) => Array<{ heading: string; content: string }> | undefined;
}): string => {
  const jsonSchema = zodToJsonSchema(schema);
  const fieldTable = formatFieldTable(jsonSchemaToFieldTable(jsonSchema));

  const sections = [`# ${title}`, '', '## Top-Level Fields', '', fieldTable];

  for (const extra of extraSections?.(jsonSchema) ?? []) {
    if (extra.content) {
      sections.push('', `## ${extra.heading}`, '', extra.content);
    }
  }

  return sections.join('\n');
};

export const generateOperationsDoc = ({
  title,
  schema,
  discriminatorKey = 'operation',
}: {
  title: string;
  schema: z.ZodType;
  discriminatorKey?: string;
}): string => {
  const jsonSchema = toVariantJsonSchema(schema, discriminatorKey, title);
  return [`# ${title}`, '', formatVariantSchemas(jsonSchema)].join('\n');
};

export const generateOperationsUsageList = ({
  title,
  schema,
  discriminatorKey = 'operation',
}: {
  title: string;
  schema: z.ZodType;
  discriminatorKey?: string;
}): string => {
  const jsonSchema = toVariantJsonSchema(schema, discriminatorKey, title);
  const variants = (jsonSchema.oneOf ?? jsonSchema.anyOf) as JsonSchemaNode[];
  return variants.map((variant) => `- ${variant.description}`).join('\n');
};

export const getDescribedEnumValues = (
  schema: z.ZodType,
  schemaName: string
): DescribedEnumValue[] => {
  const union = throwIfNotZodUnion(schema, schemaName);

  const missing: string[] = [];
  const values: DescribedEnumValue[] = [];
  for (const option of union.options) {
    if (!(option instanceof z.ZodLiteral) || typeof option.value !== 'string') {
      missing.push('(non-literal value)');
      continue;
    }
    const description = option.description?.trim() ?? '';
    if (!description) {
      missing.push(option.value);
      continue;
    }
    values.push({ value: option.value, description });
  }

  throwIfMissingDescribes(missing, `${schemaName} value(s)`);
  return values;
};

const generateEnumList = ({
  schema,
  schemaName,
}: {
  schema: z.ZodType;
  schemaName: string;
}): string =>
  getDescribedEnumValues(schema, schemaName)
    .map(({ value, description }) => `- \`${value}\`: ${description}`)
    .join('\n');

export const formatEnumValuesList = (values: readonly string[]): string =>
  values.map((v) => `\`${v}\``).join(', ');

// ---------------------------------------------------------------------------
// SLO-specific generators
// ---------------------------------------------------------------------------

export const generateSloIndicatorsDoc = (): string => {
  const jsonSchema = toVariantJsonSchema(sloIndicatorSchema, 'type', 'SLO Indicator Types');
  return [
    '# SLO Indicator Types',
    '',
    '`indicator` defines how the SLI is computed. Pick the variant by data source.',
    'Each indicator type maps to a specific `type` discriminator value.',
    '',
    formatVariantSchemas(jsonSchema),
  ].join('\n');
};

export const generateObjectiveDoc = (): string => {
  const budgetingMethods = generateEnumList({
    schema: sloBudgetingMethodSchema,
    schemaName: 'sloBudgetingMethodSchema',
  });

  const timeWindowJsonSchema = zodToJsonSchema(sloTimeWindowSchema) as JsonSchemaNode;
  const twVariants =
    ((timeWindowJsonSchema.oneOf ?? timeWindowJsonSchema.anyOf) as JsonSchemaNode[] | undefined) ??
    [];

  const extractDurations = (typeLiteral: string): string => {
    const variant = twVariants.find((v) => {
      const props = v.properties as JsonSchemaNode | undefined;
      const typeField = props?.type as JsonSchemaNode | undefined;
      return typeField?.const === typeLiteral;
    });
    if (!variant) return '';
    const props = variant.properties as JsonSchemaNode | undefined;
    const durationField = props?.duration as JsonSchemaNode | undefined;
    const enumValues = durationField?.enum as string[] | undefined;
    return enumValues ? formatEnumValuesList(enumValues) : '';
  };

  const rollingDurations = extractDurations('rolling') || '`7d`, `30d`, `90d`';
  const calendarDurations = extractDurations('calendarAligned') || '`1w`, `1M`';

  return [
    '# Objectives and Error Budgets',
    '',
    '## Budgeting Methods',
    '',
    budgetingMethods,
    '',
    '## Time Windows',
    '',
    `- **rolling**: sliding window, continuously updated. Allowed durations: ${rollingDurations}.`,
    `- **calendarAligned**: resets at the start of each calendar period. Allowed durations: ${calendarDurations}.`,
    '',
    '## Error Budget Math',
    '',
    'error budget = 1 − `target`',
    '',
    'consumed budget = bad fraction ÷ error budget',
    '',
    'Example: target `0.999` over a `30d` rolling window ⇒ 0.1% error budget ≈ 43.2 minutes of bad events.',
    '',
    '## Constraints',
    '',
    '- `target` must be strictly between 0 and 1 (exclusive). Example: `0.999` = 99.9%.',
    '- `timesliceTarget` and `timesliceWindow` are **required** when `budgetingMethod` is `"timeslices"`. They are ignored for `"occurrences"`.',
    '- `timesliceWindow` accepts `m` or `h` units (e.g. `"5m"`, `"1h"`) and must be shorter than the time window.',
    '- `sli.metric.timeslice` indicator requires `budgetingMethod: "timeslices"`.',
  ].join('\n');
};
