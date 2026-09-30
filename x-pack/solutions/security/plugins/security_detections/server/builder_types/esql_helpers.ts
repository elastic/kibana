/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLSingleAstItem } from '@elastic/esql/types';

// ---------------------------------------------------------------------------
// Shared ES|QL AST construction helpers for detection compile functions
//
// Both security.detection.query and security.detection.threshold use KQL()
// and QSTR() for their filter steps, and both read index patterns from
// user-supplied builder fields.  These helpers centralise the two patterns so
// the two types cannot drift from each other.
//
// Ref: rule-execution-logic.md "AST composition is the required pattern"
//      rule-execution-logic.md "security.detection.query"
//      rule-execution-logic.md "security.detection.threshold"
// ---------------------------------------------------------------------------

/**
 * Builds a FROM source node for a single index pattern.
 *
 * The source is emitted as a quoted identifier (`"logs-*"`) so that
 * user-supplied index patterns are always escaped by the AST builder and
 * cannot introduce extra pipeline commands.  A plain `Builder.expression.source.index()`
 * call emits the name unquoted, which lets an entry like `"logs-* | LIMIT 1"`
 * inject a second command into the compiled query.
 *
 * Ref: rule-execution-logic.md "AST composition is the required pattern"
 */
export const buildQuotedIndexSource = (idx: string) => {
  const quotedLiteral = Builder.expression.literal.string(idx, { unquoted: false });
  return Builder.expression.source.node({ sourceType: 'index', index: quotedLiteral });
};

/**
 * Builds the full-text filter expression for the WHERE clause.
 *
 * - `language: 'kuery'` → `KQL("<query>")`
 * - `language: 'lucene'` → `QSTR("<query>", {"allow_wildcard": TRUE})`
 *
 * The `allow_wildcard: true` option is the one QSTR setting v1 pins that QSTR
 * defaults off.  It is passed as a named-parameter map (`{"allow_wildcard": TRUE}`),
 * which is the only form ES|QL accepts for QSTR's optional second argument.  A
 * binary `=` or `:` expression is a syntax error or a match expression,
 * respectively — not an option map — and Elasticsearch rejects both.
 *
 * The user-supplied query text is always an AST string literal, never spliced
 * into source text.
 *
 * Ref: rule-execution-logic.md "security.detection.query"
 *      rule-execution-logic.md "security.detection.threshold" ("the same KQL() or QSTR() wrap")
 */
export const buildFullTextFilter = (
  query: string,
  language: 'kuery' | 'lucene'
): ESQLSingleAstItem => {
  const queryLiteral = Builder.expression.literal.string(query);

  if (language === 'kuery') {
    return Builder.expression.func.call('KQL', [queryLiteral]);
  }

  // lucene: QSTR("...", {"allow_wildcard": TRUE})
  const optionsMap = Builder.expression.map({
    entries: [Builder.expression.entry('allow_wildcard', Builder.expression.literal.boolean(true))],
  });
  return Builder.expression.func.call('QSTR', [queryLiteral, optionsMap]);
};
