/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
 * True when `quote` appears in `text`. An internal ellipsis is treated as a gap:
 * each side must appear, so a genuinely truncated verbatim quote still verifies
 * while a fabrication stitched from unrelated fragments does not.
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
  return segments.every((segment) => haystack.includes(segment));
};

export type EsqlGroundedResult = { ok: true } | { ok: false; reason: string };

/**
 * Literals shorter than this are never treated as report signals. A `LIMIT`, a
 * small numeric threshold, or a one-letter alias is not evidence, and a substring
 * test on such a value false-positives against any digit run or word in the text.
 */
const MIN_GROUNDING_LENGTH = 4;

/**
 * A generated query must filter on at least one value drawn from the report, so a
 * hit means the environment matched *the report* rather than merely that a
 * required index has rows.
 *
 * `FROM`/`LOOKUP JOIN`/`ENRICH` targets are `source` nodes, not literals, so index
 * names are excluded by construction; only the values the query compares against
 * are considered. A literal grounds the query when it equals an extracted IOC or
 * appears verbatim in the report text.
 *
 * This is the string-literal form of the check: it catches the unfiltered-query
 * case without modelling which literals sit in a filtering command specifically.
 * Narrowing it to the `WHERE`/filter AST is the natural next step if this proves
 * too loose.
 */
export const assertEsqlGroundedInReport = (
  query: string,
  { reportText, iocValues }: { reportText: string; iocValues: string[] }
): EsqlGroundedResult => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return { ok: false, reason: 'query failed to parse' };
  }

  // Index patterns (`FROM`/`LOOKUP JOIN`/`ENRICH` targets) surface as both source and
  // literal nodes, so collect the source names and exclude them: reading an index is not
  // filtering on report data, even if the report happens to name that index.
  const sources = new Set<string>();
  Walker.walk(root, { visitSource: ({ name }) => sources.add(normalize(name)) });

  const literals: string[] = [];
  Walker.walk(root, {
    visitLiteral: ({ value }) => literals.push(stripFraming(String(value))),
  });

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
      reason: 'query filters on no value drawn from the report (no matching IOC or report literal)',
    };
  }
  return { ok: true };
};
