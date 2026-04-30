/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/**
 * Elasticsearch field types supported for value list documents (list items index).
 * Kept in sync with `.list-item` index mappings in the lists plugin.
 */
export const valueListElasticsearchDataTypes = {
  binary: null,
  boolean: null,
  byte: null,
  date: null,
  date_nanos: null,
  date_range: null,
  double: null,
  double_range: null,
  float: null,
  float_range: null,
  geo_point: null,
  geo_shape: null,
  half_float: null,
  integer: null,
  integer_range: null,
  ip: null,
  ip_range: null,
  keyword: null,
  long: null,
  long_range: null,
  shape: null,
  short: null,
  text: null,
} as const;

/**
 * Types of all the regular single value list items but not exception list
 * or exception list types. Those types are in the list_types folder.
 */
export const type = t.keyof(valueListElasticsearchDataTypes);

export const typeOrUndefined = t.union([type, t.undefined]);
export type Type = keyof typeof valueListElasticsearchDataTypes;
export type TypeOrUndefined = t.TypeOf<typeof typeOrUndefined>;

/**
 * Preferred ordering for UI pickers (common types first, then numeric, date, ranges, geo).
 * Compile-time check: every {@link Type} must appear exactly once.
 */
export const VALUE_LIST_ELASTICSEARCH_TYPES_ORDERED = [
  'keyword',
  'text',
  'ip',
  'ip_range',
  'boolean',
  'byte',
  'short',
  'integer',
  'long',
  'float',
  'half_float',
  'double',
  'date',
  'date_nanos',
  'binary',
  'integer_range',
  'float_range',
  'long_range',
  'double_range',
  'date_range',
  'geo_point',
  'geo_shape',
  'shape',
] as const satisfies readonly Type[];

type TypesOrdered = (typeof VALUE_LIST_ELASTICSEARCH_TYPES_ORDERED)[number];
type AssertExhaustiveOrderedList = Exclude<Type, TypesOrdered> extends never
  ? Exclude<TypesOrdered, Type> extends never
    ? true
    : never
  : never;
// If this fails to typecheck, update VALUE_LIST_ELASTICSEARCH_TYPES_ORDERED to match Type.
const _valueListTypesOrderedIsExhaustive: AssertExhaustiveOrderedList = true;
void _valueListTypesOrderedIsExhaustive;
