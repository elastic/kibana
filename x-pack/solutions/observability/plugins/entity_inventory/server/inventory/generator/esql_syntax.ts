/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { InventoryDefinitionError } from './errors';

/**
 * Backtick-quotes a field or column reference, doubling any embedded backtick; reserved words
 * (`last`, `count`) and numeric path segments (`system.load.1`) are parse errors unquoted.
 */
export const quoteIdentifier = (name: string): string => `\`${name.replace(/`/g, '``')}\``;

const SAFE_INDEX_PATTERN = /^[A-Za-z0-9_.:*?-]+$/;

/**
 * Whether an index pattern uses only characters that can be placed verbatim after `FROM` or `TS`;
 * {@link assertSafeIndexPattern} also requires it to parse.
 */
export const isSafeIndexPattern = (pattern: string): boolean =>
  SAFE_INDEX_PATTERN.test(pattern) && !pattern.startsWith('-');

/**
 * Throws an {@link InventoryDefinitionError} when an index pattern is not safe to place in a query.
 * This is the full rule: the character set check, then `FROM <pattern>` must parse.
 */
export const assertSafeIndexPattern = (pattern: string): void => {
  if (!isSafeIndexPattern(pattern)) {
    throw new InventoryDefinitionError(
      `index pattern must be non-empty, use only letters, digits, "_", ".", "-", "*", "?" and ":", and not start with "-": "${pattern}"`
    );
  }
  const { errors } = Parser.parse(`FROM ${pattern}`);
  if (errors.length > 0) {
    throw new InventoryDefinitionError(
      `index pattern does not parse as an ES|QL source: ${errors[0].message}: "${pattern}"`
    );
  }
};
