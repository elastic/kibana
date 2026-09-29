/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/Either';
import * as t from 'io-ts';

import { nonEmptyStringRt, sourceLocationRt } from '../source_location_codec';

/** Validates ES|QL parameter names are safe identifiers. */
const parameterNameRt = t.refinement(
  t.string,
  (value) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(value),
  'ParameterName'
);
/** Restricts source examples to index-pattern-safe characters. */
const sourceExampleRt = t.refinement(
  t.string,
  (value) =>
    value.split(',').every((token) => token.length > 0 && /^[a-zA-Z0-9._*?:?-]+$/.test(token)),
  'SourceExample'
);

/** Requires every parameter to have a name and useful description. */
const parameterDescriptionRt = t.type({ description: nonEmptyStringRt, name: parameterNameRt });
/** Validates typed parameter metadata used during query rendering. */
export const queryParameterRt = t.union([
  t.intersection([
    parameterDescriptionRt,
    t.type({ kind: t.literal('source'), example: sourceExampleRt }),
  ]),
  t.intersection([
    parameterDescriptionRt,
    t.type({ kind: t.literal('identifier'), example: nonEmptyStringRt }),
  ]),
  t.intersection([
    parameterDescriptionRt,
    t.type({ kind: t.literal('string'), example: t.string }),
  ]),
  t.intersection([
    parameterDescriptionRt,
    t.type({ kind: t.literal('boolean'), example: t.boolean }),
  ]),
  t.intersection([
    parameterDescriptionRt,
    t.type({
      kind: t.literal('number'),
      example: t.refinement(t.number, Number.isFinite, 'FiniteNumber'),
    }),
  ]),
]);

export type QueryParameter = t.TypeOf<typeof queryParameterRt>;

/** Restricts catalog signals to supported log, metric, and trace domains. */
export const signalTypeRt = t.keyof({ log: null, metric: null, trace: null });
export type SignalType = t.TypeOf<typeof signalTypeRt>;

/** Describes the parameter map and template text shared by query codecs. */
export const queryTemplateFieldsRt = t.type({
  parameters: t.record(parameterNameRt, queryParameterRt),
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

/** Identifies one context-free reserved Code Intelligence placeholder. */
interface PlaceholderOccurrence {
  /** Marks the exclusive end offset for deterministic rendering replacement. */
  readonly end: number;
  /** Names the declared parameter referenced by this placeholder. */
  readonly name: string;
  /** Marks the inclusive start offset for deterministic rendering replacement. */
  readonly start: number;
}

/** Captures reserved-token occurrences and malformed brackets in any template context. */
interface PlaceholderScan {
  /** Reports whether an unrecognized reserved delimiter sequence was found. */
  readonly malformed: boolean;
  /** Lists reserved placeholders in source order for validation and rendering. */
  readonly occurrences: readonly PlaceholderOccurrence[];
}

/** Matches the reserved context-free Code Intelligence placeholder syntax. */
const placeholderPattern = /\[\[([a-zA-Z][a-zA-Z0-9_]*)\]\]/g;

/** Scans reserved [[name]] tokens without interpreting ES|QL syntax or literal context. */
const scanPlaceholders = (query: string): PlaceholderScan => {
  /** Collects recognized tokens and their source offsets for deterministic rendering. */
  const occurrences = [...query.matchAll(placeholderPattern)].map((match) => ({
    end: (match.index ?? 0) + match[0].length,
    name: match[1],
    start: match.index ?? 0,
  }));
  /** Removes valid tokens so only malformed doubled delimiters remain visible. */
  const unmatched = query.replace(placeholderPattern, '');
  /** Rejects nested bracket runs around otherwise valid tokens. */
  const nested = occurrences.some(
    ({ end, start }) => query[start - 1] === '[' || query[end] === ']'
  );
  return { malformed: nested || unmatched.includes('[[') || unmatched.includes(']]'), occurrences };
};

/** Detects reserved token occurrences that would be embedded inside an ES|QL literal or identifier. */
const hasQuotedPlaceholder = (
  query: string,
  occurrences: readonly PlaceholderOccurrence[]
): boolean => {
  /** Tests whether a scanned literal range contains a reserved token start offset. */
  const containsPlaceholder = (start: number, end: number): boolean =>
    occurrences.some((occurrence) => occurrence.start >= start && occurrence.start < end);
  /** Advances through only the ES|QL literal forms relevant to placement validation. */
  let index = 0;
  while (index < query.length) {
    /** Marks the opening offset of the literal or identifier currently being scanned. */
    const start = index;
    if (query.startsWith('"""', index)) {
      index += 3;
      while (index < query.length && !query.startsWith('"""', index)) index += 1;
      /** Consumes the valid closing delimiter plus up to 2 literal trailing quotes. */
      let closingQuotes = 0;
      while (closingQuotes < 5 && query[index + closingQuotes] === '"') closingQuotes += 1;
      index = Math.min(index + closingQuotes, query.length);
      if (containsPlaceholder(start, index)) return true;
      continue;
    }
    if (query[index] === '"') {
      index += 1;
      while (index < query.length) {
        if (query[index] === '\\') index += 2;
        else if (query[index] === '"') {
          index += 1;
          break;
        } else index += 1;
      }
      if (containsPlaceholder(start, index)) return true;
      continue;
    }
    if (query[index] === '`') {
      index += 1;
      while (index < query.length) {
        if (query[index] === '`' && query[index + 1] === '`') index += 2;
        else if (query[index] === '`') {
          index += 1;
          break;
        } else index += 1;
      }
      if (containsPlaceholder(start, index)) return true;
      continue;
    }
    index += 1;
  }
  return false;
};

/** Reports undeclared, unused, malformed, misplaced, or mistyped template placeholders. */
export const queryTemplateInvariantError = (
  template: t.TypeOf<typeof queryTemplateFieldsRt>
): string | undefined => {
  /** Collects context-free reserved placeholder names for invariant reconciliation. */
  const scan = scanPlaceholders(template.query);
  /** Lists recognized parameter names for declared-versus-used reconciliation. */
  const placeholders = scan.occurrences.map((occurrence) => occurrence.name);

  if (scan.malformed) {
    return 'Template contains an invalid placeholder.';
  }
  if (hasQuotedPlaceholder(template.query, scan.occurrences)) {
    return 'Template placeholders must not be quoted.';
  }
  if (!placeholders.includes('source')) {
    return 'Template must declare and use [[source]].';
  }
  for (const placeholder of placeholders) {
    /** Holds the declared parameter matched to the current placeholder. */
    const parameter = template.parameters[placeholder];
    if (parameter === undefined) {
      return `Template contains undeclared parameter [[${placeholder}]].`;
    }
    if (parameter.name !== placeholder) {
      return `Parameter key ${placeholder} does not match parameter name ${parameter.name}.`;
    }
  }
  for (const name of Object.keys(template.parameters)) {
    if (!placeholders.includes(name)) {
      return `Template declares unused parameter ${name}.`;
    }
  }
  return template.parameters.source?.kind !== 'source'
    ? 'The source parameter must use the source kind.'
    : undefined;
};

/** A deterministic ES|QL template with complete, context-aware parameters. */
export const queryTemplateRt = new t.Type<t.TypeOf<typeof queryTemplateBaseRt>, unknown, unknown>(
  'QueryTemplate',
  (value): value is t.TypeOf<typeof queryTemplateBaseRt> =>
    queryTemplateBaseRt.is(value) && queryTemplateInvariantError(value) === undefined,
  (value, context) => {
    /** Holds validated external data for the following invariant checks. */
    const decoded = queryTemplateBaseRt.validate(value, context);
    if (decoded._tag === 'Left') return decoded;
    /** Holds the invariant or codec error returned to the caller. */
    const error = queryTemplateInvariantError(decoded.right);
    return error === undefined ? t.success(decoded.right) : t.failure(value, context, error);
  },
  (value) => value
);

export type QueryTemplate = t.TypeOf<typeof queryTemplateRt>;

/** Brands queries only after all placeholders have been rendered safely. */
const renderedQueryBrand: unique symbol = Symbol('RenderedQuery');

/** ES|QL after every placeholder has been replaced with its context-safe example. */
export interface RenderedQuery {
  readonly query: string;
  readonly [renderedQueryBrand]: 'RenderedQuery';
}

/** Escapes one typed value according to its ES|QL context for deterministic template construction. */
export const renderQueryParameter = (parameter: QueryParameter): string => {
  switch (parameter.kind) {
    case 'source':
      return parameter.example;
    case 'identifier':
      // Identifier escaping doubles backticks because identifiers cannot use string quoting.
      return `\`${parameter.example.replaceAll('`', '``')}\``;
    case 'string':
      // String escaping prevents example values from terminating the generated literal.
      return `"${parameter.example.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
    case 'boolean':
      return String(parameter.example);
    case 'number':
      return String(parameter.example);
  }
};

/** Renders a codec-validated template for the QueryValidator port. */
export const renderQueryTemplate = (template: QueryTemplate): RenderedQuery => {
  /** Holds validated external data for the following invariant checks. */
  const decoded = queryTemplateRt.decode(template);
  if (isLeft(decoded)) throw new TypeError('Query template does not satisfy its codec.');

  return {
    query: (() => {
      /** Reuses context-free reserved-token recognition for deterministic replacement. */
      const occurrences = scanPlaceholders(decoded.right.query).occurrences;
      /** Builds output from source slices so only recognized reserved tokens are replaced. */
      let rendered = '';
      /** Tracks the end of the last copied query segment. */
      let offset = 0;
      for (const occurrence of occurrences) {
        /** Holds the declared parameter selected by the current source occurrence. */
        const parameter = decoded.right.parameters[occurrence.name];
        if (parameter === undefined)
          throw new TypeError(`Template contains undeclared parameter [[${occurrence.name}]].`);
        rendered +=
          decoded.right.query.slice(offset, occurrence.start) + renderQueryParameter(parameter);
        offset = occurrence.end;
      }
      /** Appends the final untouched query segment after the last reserved token. */
      const completed = rendered + decoded.right.query.slice(offset);
      // Codec validation guarantees every placeholder from the template was replaced. Rendered string
      // examples may themselves contain `[[name]]` as meaningful source text and are safely quoted.
      return completed;
    })(),
    [renderedQueryBrand]: 'RenderedQuery',
  };
};

/** Validates explicit valid, invalid, and skipped query outcomes. */
export const queryValidationResultRt = t.union([
  t.type({ diagnostics: t.readonlyArray(t.string), status: t.literal('valid') }),
  t.type({ diagnostics: t.readonlyArray(t.string), status: t.literal('invalid') }),
  t.type({ diagnostics: t.readonlyArray(t.string), status: t.literal('skipped') }),
]);

export type QueryValidationResult = t.TypeOf<typeof queryValidationResultRt>;
