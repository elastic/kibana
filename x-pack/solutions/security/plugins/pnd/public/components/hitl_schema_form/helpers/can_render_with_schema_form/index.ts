/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_SCHEMA_FORM_FIELD_TYPES } from '../../types';
import type {
  PndSchemaFormEnumMember,
  PndSchemaFormFieldType,
  PndSchemaFormSchema,
} from '../../types';

/**
 * JSON Schema keywords that compose or indirect a schema. The renderer walks
 * `properties` once and has nowhere to resolve these, so their presence means
 * the schema is not renderable rather than that they can be ignored.
 */
const UNSUPPORTED_KEYWORDS = ['$ref', 'allOf', 'anyOf', 'definitions', 'oneOf'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const declaresUnsupportedKeyword = (value: Record<string, unknown>): boolean =>
  UNSUPPORTED_KEYWORDS.some((keyword) => value[keyword] !== undefined);

const isSupportedFieldType = (value: unknown): value is PndSchemaFormFieldType =>
  PND_SCHEMA_FORM_FIELD_TYPES.includes(value as PndSchemaFormFieldType);

const isEnumMember = (value: unknown): value is PndSchemaFormEnumMember =>
  typeof value === 'number' || typeof value === 'string';

/**
 * An absent enum is fine, and so is an empty one: the control dispatch falls
 * through to the property's own type, which still renders. What is not fine is
 * an enum that is not a list of primitives, because there is no option to draw.
 */
const isRenderableEnum = (value: unknown): boolean =>
  value === undefined || (Array.isArray(value) && value.every(isEnumMember));

/**
 * An `array` renders as a multi-select, so it needs choices. Without a
 * non-empty `items.enum` there is nothing to offer and a free-text list is not
 * a control this form has.
 */
const isRenderableArrayItems = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { enum: itemEnum } = value;

  return Array.isArray(itemEnum) && itemEnum.length > 0 && itemEnum.every(isEnumMember);
};

const isRenderableField = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (declaresUnsupportedKeyword(value)) return false;

  const { items, type } = value;

  // A nested object is rejected here: `object` is not a supported field type,
  // and the renderer is deliberately one level deep.
  if (!isSupportedFieldType(type)) return false;
  if (!isRenderableEnum(value.enum)) return false;
  if (type === 'array' && !isRenderableArrayItems(items)) return false;

  return true;
};

const isRenderableRequired = (value: unknown): boolean =>
  value === undefined || (Array.isArray(value) && value.every((name) => typeof name === 'string'));

/**
 * Whether a gate's `inputSchema` can be rendered by {@link SchemaForm}.
 *
 * This is the only supported way to turn a proposal row's
 * `Record<string, unknown>` into a `PndSchemaFormSchema`. It is deliberately
 * total and fail-closed: **every** answer of `false` — including the `{}` that
 * a row carries when its gate declares no schema — means the caller renders its
 * own fixed decision-plus-rationale controls instead. A half-rendered gate is
 * worse than a gate rendered the old way.
 */
export const canRenderWithSchemaForm = (schema: unknown): schema is PndSchemaFormSchema => {
  if (!isRecord(schema)) return false;
  if (declaresUnsupportedKeyword(schema)) return false;

  const { properties, required, type } = schema;

  if (type !== undefined && type !== 'object') return false;
  if (!isRecord(properties)) return false;

  const fields = Object.values(properties);

  if (fields.length === 0) return false;
  if (!fields.every(isRenderableField)) return false;

  return isRenderableRequired(required);
};
