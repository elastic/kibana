/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractSurroundingPlaceholders, SURROUNDING_BIND_PARAMS } from './hunt_definition';

export type SurroundingParamValue = string | number | boolean;

const MAX_STRING_LENGTH = 1024;
const MAX_NUMBER_LENGTH = 40;

const escapeEsqlString = (value: string): string =>
  `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}"`;

/** Renders one value as a typed ES|QL literal: strings quoted and escaped, numbers and booleans bare. */
export const toEsqlLiteral = (value: SurroundingParamValue): string => {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Surrounding query numbers must be finite');
    }
    const rendered = String(value);
    if (/e/i.test(rendered) || rendered.length > MAX_NUMBER_LENGTH) {
      throw new Error('Surrounding query number is out of range');
    }
    return rendered;
  }
  if (value.length > MAX_STRING_LENGTH) {
    throw new Error(`Surrounding query string exceeds ${MAX_STRING_LENGTH} characters`);
  }
  return escapeEsqlString(value);
};

/**
 * Substitutes every `{{param.<name>}}` in a curated surrounding-event query with a typed ES|QL
 * literal. Only the occurrence key fields and the runner binds are accepted, every placeholder
 * must be supplied, and nothing is concatenated as raw text, so a value cannot add query syntax.
 */
export const bindSurroundingQuery = ({
  query,
  keyFields,
  params,
}: {
  query: string;
  keyFields: readonly string[];
  params: Readonly<Record<string, SurroundingParamValue>>;
}): string => {
  const allowed = new Set<string>([...keyFields, ...SURROUNDING_BIND_PARAMS]);
  const supplied = Object.keys(params);
  const unexpected = supplied.filter((name) => !allowed.has(name));
  if (unexpected.length > 0) {
    throw new Error(`Unexpected surrounding query parameter(s): ${unexpected.join(', ')}`);
  }
  const needed = new Set(extractSurroundingPlaceholders(query));
  const missing = [...needed].filter((name) => !(name in params));
  if (missing.length > 0) {
    throw new Error(`Missing surrounding query parameter(s): ${missing.join(', ')}`);
  }
  return query.replace(/\{\{param\.([^{}\s]+)\}\}/g, (_, name: string) =>
    toEsqlLiteral(params[name])
  );
};
