/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstNode, ESQLAstQueryExpression } from '@elastic/esql';
import { Parser, Walker } from '@elastic/esql';

/**
 * Grounding checks for Tier 2 output.
 *
 * Extraction and generation are asked — in prose, in the extraction/generation
 * contract — to quote the report verbatim and to filter on a concrete value from
 * it. Nothing verifies either claim of the model's output, so the shape and the
 * scope are checked but the grounding is not: a fabricated `evidence_quote`
 * becomes a proposed behavior and an indexed finding attributed to the report,
 * and an unfiltered `FROM logs-aws.* | LIMIT 1` clears the source gate, executes,
 * returns an arbitrary row, and sets `has_confirmed_hit` — a corroboration that
 * is evidence of nothing. These two functions verify the output against the
 * report the claims are attributed to.
 */

/** Fold case and whitespace so a claim that differs only in formatting still matches. */
const normalize = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim();

/** Strip surrounding quote characters and leading/trailing ellipsis the model may add. */
const stripFraming = (value: string): string =>
  value
    .replace(/^[\s"'`“”‘’]+|[\s"'`“”‘’]+$/g, '')
    .replace(/^(?:\.\.\.|…)\s*|\s*(?:\.\.\.|…)$/g, '')
    .trim();

/**
 * True when `quote` appears in `text`. An internal ellipsis is treated as a gap in a
 * sequence: every segment must appear, in order, so a genuinely truncated verbatim
 * quote still verifies while a fabrication stitched from unrelated fragments does not.
 */
export const isEvidenceQuoteGrounded = (quote: string, text: string): boolean => {
  const haystack = normalize(text);
  const segments = stripFraming(quote)
    .split(/\s*(?:\.\.\.|…)\s*/)
    .map(normalize)
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return false;
  }
  // Each segment is searched from the end of the previous match, so the order of the
  // segments is part of the claim being verified. Testing them independently accepts a
  // quote that rearranges the report: for `AssumeRole was followed by data access`,
  // `data access ... AssumeRole` reverses the chronology the report states, and Tier 2
  // would publish a behavior and an indexed finding asserting it. Advancing past each
  // match also stops one occurrence satisfying two segments, so `foo ... foo` no longer
  // verifies against a text containing a single `foo`.
  let searchFrom = 0;
  for (const segment of segments) {
    const at = haystack.indexOf(segment, searchFrom);
    if (at === -1) {
      return false;
    }
    searchFrom = at + segment.length;
  }
  return true;
};

export type EsqlGroundedResult = { ok: true } | { ok: false; reason: string };

/**
 * Literals shorter than this are never treated as report signals. A `LIMIT`, a
 * small numeric threshold, or a one-letter alias is not evidence, and a substring
 * test on such a value false-positives against any digit run or word in the text.
 */
const MIN_GROUNDING_LENGTH = 4;

/**
 * Fields that describe where a document sits rather than what it records. A filter on one
 * of them narrows the scope, which the hunt has already fixed, so it is not report evidence.
 */
const METADATA_COLUMNS: ReadonlySet<string> = new Set([
  '_index',
  '_id',
  '_version',
  '_score',
  '_source',
  '_ignored',
]);

/**
 * Collects the literals a query uses to restrict which rows it reads. Two positions
 * qualify: the `WHERE` command, and the aggregation filter in `STATS ... WHERE ...`,
 * which the parser represents as a `where` function inside the `STATS` command rather
 * than as a command of its own. `FORK` branches are reached because their `WHERE`s are
 * ordinary nested commands.
 *
 * Literals anywhere else describe the shape of the output rather than narrowing the
 * input: an `EVAL` assignment, a `SORT` key, a `LIMIT`, a `GROK` pattern, an index name.
 */
const collectFilterLiterals = (root: ESQLAstQueryExpression): string[] => {
  const literals: string[] = [];
  const collect = (node: ESQLAstNode | ESQLAstNode[]) =>
    Walker.walk(node, {
      visitFunction: (fn, _parent, walker) => {
        // A comparison against a metadata field restates the scope rather than describing
        // the report: `WHERE _index == "logs-aws.cloudtrail-default"` filters on the index
        // the hunt was already pointed at and returns arbitrary rows from it. Skipping the
        // subtree drops the literal on the other side of the comparison with it.
        const comparesMetadata = fn.args.some(
          (arg) =>
            !Array.isArray(arg) &&
            'type' in arg &&
            arg.type === 'column' &&
            METADATA_COLUMNS.has(arg.name.toLowerCase())
        );
        if (comparesMetadata) walker.skipChildren();
      },
      visitLiteral: ({ value }) => literals.push(stripFraming(String(value))),
    });

  Walker.walk(root, {
    visitCommand: (command) => {
      if (command.name === 'where') collect(command);
    },
    visitFunction: (fn) => {
      // `STATS c = COUNT(*) WHERE user.name == "x"` parses as a `where` function whose
      // first argument is the aggregation and second is the predicate. Only the second
      // filters rows — the aggregation may hold literals of its own.
      if (fn.name === 'where' && fn.args.length > 1) collect(fn.args[1]);
    },
  });

  return literals;
};

/**
 * A generated query must filter on at least one value drawn from the report, so a
 * hit means the environment matched *the report* rather than merely that a
 * required index has rows.
 *
 * Only literals in a row-filtering predicate count. Considering literals anywhere in
 * the pipeline let `FROM logs-aws.* | EVAL label = "AssumeRole" | LIMIT 1` pass while
 * filtering on nothing at all: the report's value appears in the query text, and the
 * query still returns the first arbitrary row of a required index, which Tier 2 then
 * counts as corroboration. A value the query merely mentions is not a value it searched
 * for. A qualifying literal grounds the query when it equals an extracted IOC or appears
 * verbatim in the report text.
 *
 * The gate is deliberately a value test rather than a semantic one, so it does not
 * attempt to prove the predicate is *restrictive* — a tautology disjoined onto a
 * grounded comparison would still pass. It establishes that the report reached the
 * predicate, which is what the unfiltered and mention-only cases lack.
 */
export const assertEsqlGroundedInReport = (
  query: string,
  { reportText, iocValues }: { reportText: string; iocValues: string[] }
): EsqlGroundedResult => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return { ok: false, reason: 'query failed to parse' };
  }

  const literals = collectFilterLiterals(root);
  if (literals.length === 0) {
    return {
      ok: false,
      reason: 'query has no filtering predicate, so any row in scope would answer it',
    };
  }

  // Index patterns surface as `source` nodes, so a literal equal to one of them is the
  // query naming its own scope. `collectFilterLiterals` already drops comparisons against
  // `_index`; this covers the rest, at the cost of rejecting a report value that happens
  // to be spelled exactly like an index pattern.
  const sources = new Set<string>();
  Walker.walk(root, { visitSource: ({ name }) => sources.add(normalize(name)) });

  const haystack = normalize(reportText);
  const groundingIocs = new Set(iocValues.map(normalize).filter((value) => value.length > 0));

  const grounded = literals.some((literal) => {
    const value = normalize(literal);
    if (value.length < MIN_GROUNDING_LENGTH || sources.has(value)) {
      return false;
    }
    return groundingIocs.has(value) || haystack.includes(value);
  });

  if (!grounded) {
    return {
      ok: false,
      reason:
        'query filters on no value drawn from the report (no matching IOC or report literal in a filtering predicate)',
    };
  }
  return { ok: true };
};
