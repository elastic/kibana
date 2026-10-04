/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { nonEmptyStringRt, sourceLocationRt } from '../source_location_codec';

/** Restricts catalog signals to supported log, metric, and trace domains. */
export const signalTypeRt = t.keyof({ log: null, metric: null, trace: null });
export type SignalType = t.TypeOf<typeof signalTypeRt>;

/** Describes the concrete ES|QL text shared by query codecs. */
export const queryTemplateFieldsRt = t.type({
  query: nonEmptyStringRt,
});

/** Describes metadata and evidence attached to a query template. */
const queryTemplateBaseRt = t.intersection([
  queryTemplateFieldsRt,
  t.type({
    description: nonEmptyStringRt,
    evidence: t.readonlyArray(sourceLocationRt),
    signalType: signalTypeRt,
    title: nonEmptyStringRt,
  }),
]);

/** Rejects empty queries and stale `[[name]]` placeholder templates. */
export const queryInvariantError = (query: string): string | undefined => {
  if (query.trim().length === 0) return 'Query must not be empty.';
  return query.includes('[[') || query.includes(']]')
    ? 'Query must be concrete ES|QL without [[ or ]] placeholder delimiters.'
    : undefined;
};

/** A deterministic, directly runnable ES|QL query with its catalog metadata. */
export const queryTemplateRt = new t.Type<t.TypeOf<typeof queryTemplateBaseRt>, unknown, unknown>(
  'QueryTemplate',
  (value): value is t.TypeOf<typeof queryTemplateBaseRt> =>
    queryTemplateBaseRt.is(value) && queryInvariantError(value.query) === undefined,
  (value, context) => {
    /** Holds validated external data for the following invariant checks. */
    const decoded = queryTemplateBaseRt.validate(value, context);
    if (decoded._tag === 'Left') return decoded;
    /** Holds the invariant or codec error returned to the caller. */
    const error = queryInvariantError(decoded.right.query);
    return error === undefined ? t.success(decoded.right) : t.failure(value, context, error);
  },
  (value) => value
);

export type QueryTemplate = t.TypeOf<typeof queryTemplateRt>;

/** Renders a value as an ES|QL double-quoted string literal. */
export const esqlStringLiteral = (value: string): string =>
  // Escaping prevents source-derived values from terminating the generated literal.
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

/** Matches one dotted field-name segment that ES|QL parses without quoting. */
const bareFieldSegmentPattern = /^[a-zA-Z_@][a-zA-Z0-9_]*$/;

/** Renders a field name bare when ES|QL can parse it unquoted, otherwise backtick-quoted. */
export const esqlFieldName = (name: string): string =>
  name.split('.').every((segment) => bareFieldSegmentPattern.test(segment))
    ? name
    : `\`${name.replaceAll('`', '``')}\``;

/** Validates explicit valid, invalid, and skipped query outcomes. */
export const queryValidationResultRt = t.union([
  t.type({ diagnostics: t.readonlyArray(t.string), status: t.literal('valid') }),
  t.type({ diagnostics: t.readonlyArray(t.string), status: t.literal('invalid') }),
  t.type({ diagnostics: t.readonlyArray(t.string), status: t.literal('skipped') }),
]);

export type QueryValidationResult = t.TypeOf<typeof queryValidationResultRt>;
