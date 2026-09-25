/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstNode, ESQLAstQueryExpression, ESQLFunction, ESQLList } from '@elastic/esql';
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

/** A pipeline's own row filters, and the branches of each `FORK` whose rows it unions. */
interface PipelineFilters {
  predicates: ESQLAstNode[];
  forks: ESQLAstQueryExpression[][];
}

/**
 * Collects the predicates one pipeline uses to restrict which rows it reads, keeping the
 * branches of a `FORK` separate because they combine differently. Two positions filter rows:
 * the `WHERE` command, and the aggregation filter in `STATS ... WHERE ...`, which the parser
 * represents as a `where` function inside the `STATS` command rather than as a command of its
 * own.
 *
 * Everything else in a pipeline describes the shape of the output rather than narrowing the
 * input: an `EVAL` assignment, a `SORT` key, a `LIMIT`, a `GROK` pattern, an index name.
 */
const collectPipelineFilters = (query: ESQLAstQueryExpression): PipelineFilters => {
  const predicates: ESQLAstNode[] = [];
  const forks: ESQLAstQueryExpression[][] = [];
  for (const command of query.commands) {
    if (command.name === 'fork') {
      forks.push(
        // Each branch is a pipeline of its own, wrapped in parentheses.
        command.args.flatMap((arg) =>
          !Array.isArray(arg) && arg.type === 'parens' && 'commands' in arg.child ? [arg.child] : []
        )
      );
      continue;
    }
    if (command.name === 'where') {
      predicates.push(...command.args);
      continue;
    }
    Walker.walk(command, {
      visitFunction: (fn) => {
        // `STATS c = COUNT(*) WHERE user.name == "x"` parses as a `where` function whose first
        // argument is the aggregation and second is the predicate. Only the second filters rows —
        // the aggregation may hold literals of its own.
        if (fn.name === 'where' && fn.args.length > 1) predicates.push(fn.args[1]);
      },
    });
  }
  return { predicates, forks };
};

/** Every predicate in a query, `FORK` branches included. */
const allFilterPredicates = (query: ESQLAstQueryExpression): ESQLAstNode[] => {
  const { predicates, forks } = collectPipelineFilters(query);
  return [...predicates, ...forks.flat().flatMap(allFilterPredicates)];
};

/** Operators and functions that constrain matching rows to the value they carry. */
const POSITIVE_MATCH_OPERATORS: ReadonlySet<string> = new Set(['==', 'in', 'like', 'rlike', ':']);
const FULL_TEXT_FUNCTIONS: ReadonlySet<string> = new Set(['match', 'match_phrase', ':']);

/**
 * Functions whose argument is a query in another language. Their syntax can express alternation
 * — `QSTR("event.action: AssumeRole OR event.outcome: success")` returns the report's evidence
 * *and* every successful event — so grounding one term of the string says nothing about the rows
 * that come back, and reading the string as text cannot tell the two apart. Parsing Lucene and
 * KQL to find the alternatives is more than this gate should carry, so a query written in one of
 * them grounds nothing and keeps the non-executable placeholder. The generation contract asks
 * for comparisons on ECS fields and never for these, so this costs no query it asked for.
 */
const QUERY_STRING_FUNCTIONS: ReadonlySet<string> = new Set(['qstr', 'kql']);

/**
 * Operators that exclude the value they carry. A report artifact under one of these is the
 * inverse of a hunt for it: `WHERE event.action != "AssumeRole"` returns every event that is
 * *not* the report's evidence, and Tier 2 would count any row it returns as corroboration.
 */
const NEGATING_OPERATORS: ReadonlySet<string> = new Set([
  '!=',
  'not',
  'not in',
  'not like',
  'not rlike',
]);

/** Operators reading their literal as a pattern rather than as the value itself. */
const PATTERN_OPERATORS: ReadonlySet<string> = new Set(['like', 'rlike']);

const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

/**
 * True when `value` appears in `text` as a term of its own rather than buried inside a longer
 * word. A report describing an `unsuccessful login` contains the characters of `success`, but the
 * rows `WHERE event.outcome == "success"` brings back are the opposite of what it describes, and
 * counting them as corroboration inverts the report.
 *
 * Only an operator reading its literal as the whole value asks for this. A pattern's fragment is
 * part of a word by construction — `RLIKE "assumerol.*"` is the shape the generation contract
 * asks for — so requiring it to stand alone would reject the queries this gate exists to admit.
 */
const appearsAsTerm = (text: string, value: string): boolean => {
  for (let at = text.indexOf(value); at !== -1; at = text.indexOf(value, at + 1)) {
    const before = text[at - 1] ?? ' ';
    const after = text[at + value.length] ?? ' ';
    if (!WORD_CHARACTER.test(before) && !WORD_CHARACTER.test(after)) return true;
  }
  return false;
};

const asFunction = (node: ESQLAstNode): ESQLFunction | undefined =>
  !Array.isArray(node) && 'type' in node && node.type === 'function' ? node : undefined;

const isMetadataColumn = (node: ESQLAstNode): boolean =>
  !Array.isArray(node) &&
  'type' in node &&
  node.type === 'column' &&
  METADATA_COLUMNS.has(node.name.toLowerCase());

const LIKE_WILDCARDS = /[*?]+/;
const REGEXP_METACHARACTERS = /[.*+?()[\]{}^$\\]+/g;
/** A quantifier admitting zero occurrences of the character in front of it. */
const OPTIONAL_CHARACTER = /^[?*]/;
/** The same quantifier applied to a group, which can make a whole artifact optional. */
const OPTIONAL_GROUP = /\)\s*[?*]/;
/** A repeat whose lower bound is zero, wherever it sits and whatever it governs. */
const ZERO_BOUNDED_REPEAT = /\{\s*0\s*[,}]/;

/**
 * The fragments of one regular-expression alternative that every row it matches has to contain.
 *
 * A quantifier admitting zero occurrences makes what precedes it optional, so the fragment before
 * one is shortened by the character it governs. Applied to a group it can make an entire artifact
 * optional — `.*(AssumeRole)?.*` names the report's evidence while matching every row in scope —
 * and which fragments sat inside that group is not something splitting the pattern can recover,
 * so an alternative carrying one requires nothing and grounds nothing.
 */
const requiredRegexpFragments = (alternative: string): string[] => {
  if (OPTIONAL_GROUP.test(alternative) || ZERO_BOUNDED_REPEAT.test(alternative)) {
    return [];
  }
  const fragments: string[] = [];
  let from = 0;
  for (const run of alternative.matchAll(REGEXP_METACHARACTERS)) {
    const fragment = alternative.slice(from, run.index);
    fragments.push(OPTIONAL_CHARACTER.test(run[0]) ? fragment.slice(0, -1) : fragment);
    from = run.index + run[0].length;
  }
  fragments.push(alternative.slice(from));
  return [alternative, ...fragments];
};

/**
 * What a literal has to match for the operator reading it to be grounded, expressed as a list
 * of alternatives each of which needs one grounded fragment.
 *
 * A `LIKE`/`RLIKE` pattern is a report artifact plus metacharacters the report does not contain,
 * so comparing the pattern whole rejects a query that does search for the artifact — and a tight
 * pattern derived from an artifact is a shape the generation contract explicitly asks for.
 * Splitting on those characters is what lets the fragment be recognised.
 *
 * Three places a fragment is *optional* rather than required, and each gets the `OR` rule because
 * each is the `OR` problem written inside a string:
 *
 * - a regular expression's alternation, so `|` splits the pattern into alternatives that must
 *   each be grounded;
 * - a regular expression's quantifiers, which can drop the fragment they govern altogether;
 * - a full-text match's terms, which are ORed by default, so each term has to be grounded.
 *   Terms below `MIN_GROUNDING_LENGTH` are dropped rather than required, because that is the
 *   length at which this gate stops being able to judge a value in either direction.
 */
const groundingRequirements = (operator: string, literal: string): string[][] => {
  if (operator === 'like') {
    return [[literal, ...literal.split(LIKE_WILDCARDS)]];
  }
  if (operator === 'rlike') {
    return literal.split('|').map(requiredRegexpFragments);
  }
  if (FULL_TEXT_FUNCTIONS.has(operator)) {
    const terms = literal.split(/\s+/).filter((term) => term.length >= MIN_GROUNDING_LENGTH);
    return terms.length > 0 ? terms.map((term) => [term]) : [[literal]];
  }
  return [[literal]];
};

const literalsOf = (args: ESQLAstNode[]): string[] =>
  args.flatMap((arg) =>
    !Array.isArray(arg) && 'type' in arg && arg.type === 'literal'
      ? [stripFraming(String(arg.value))]
      : []
  );

const listValuesOf = (args: ESQLAstNode[]): string[] | undefined => {
  const list = args.find((arg) => !Array.isArray(arg) && 'type' in arg && arg.type === 'list') as
    | ESQLList
    | undefined;
  if (!list) return undefined;
  const literals = literalsOf(list.values);
  // A list holding anything other than literals — a column, a function — has a member this
  // cannot ground, which under `IN`'s alternative semantics is enough to widen the result.
  return literals.length === list.values.length ? literals : [];
};

/**
 * Whether a predicate constrains the rows it returns to a value drawn from the report.
 *
 * Presence of a report value is not enough, because a predicate decides which rows come
 * back: under `!=` or `NOT` the report's artifact selects everything except the evidence,
 * and in one branch of an `OR` it selects the evidence *plus* whatever the other branches
 * admit. So `AND` needs one grounded branch, `OR` needs all of them, and a negation grounds
 * nothing regardless of what it carries.
 */
const isPositivelyGrounded = (
  node: ESQLAstNode | ESQLAstNode[],
  grounds: (operator: string, literal: string) => boolean
): boolean => {
  if (Array.isArray(node)) {
    return node.some((child) => isPositivelyGrounded(child, grounds));
  }
  const fn = asFunction(node);
  // A bare column, literal or list constrains nothing by itself.
  if (!fn) return false;

  const operator = fn.name.toLowerCase();
  if (operator === 'and') return fn.args.some((arg) => isPositivelyGrounded(arg, grounds));
  if (operator === 'or') return fn.args.every((arg) => isPositivelyGrounded(arg, grounds));
  if (NEGATING_OPERATORS.has(operator) || QUERY_STRING_FUNCTIONS.has(operator)) return false;
  if (!POSITIVE_MATCH_OPERATORS.has(operator) && !FULL_TEXT_FUNCTIONS.has(operator)) {
    // Range comparisons and everything else: a report value under `>` is a threshold, not a
    // search for the artifact.
    return false;
  }
  // Comparing a metadata field restates the scope the hunt already fixed.
  if (fn.args.some(isMetadataColumn)) return false;

  const listValues = listValuesOf(fn.args);
  if (listValues) {
    // `IN (…)` is a set of alternatives, so it widens exactly as `OR` does: one ungrounded
    // value brings back rows the report never mentioned.
    return listValues.length > 0 && listValues.every((value) => grounds(operator, value));
  }
  return literalsOf(fn.args).some((literal) => grounds(operator, literal));
};

/**
 * Whether the rows a pipeline hands back are constrained by the report.
 *
 * The `WHERE`s of a linear pipeline compose with `AND`, so one grounded predicate anywhere in it
 * constrains every row that reaches the end. `FORK` is the exception: it unions the rows of its
 * branches, so a branch that filters on nothing of the report's contributes rows no report value
 * selected, and Tier 2 reads them as corroboration alongside the grounded ones. A fork grounds
 * the query only when every branch grounds itself — the rule the alternatives of an `OR` already
 * follow, applied to alternatives written as branches.
 */
const isPipelineGrounded = (
  query: ESQLAstQueryExpression,
  grounds: (operator: string, literal: string) => boolean
): boolean => {
  const { predicates, forks } = collectPipelineFilters(query);
  // A predicate outside the fork applies to the union, so it grounds the branches too.
  if (predicates.some((predicate) => isPositivelyGrounded(predicate, grounds))) return true;
  return forks.some(
    (branches) =>
      branches.length > 0 && branches.every((branch) => isPipelineGrounded(branch, grounds))
  );
};

/**
 * A generated query must search for at least one value drawn from the report, so a hit means
 * the environment matched *the report* rather than merely that a required index has rows.
 *
 * Two things have to hold, and each of them was a way through this gate on its own. The value
 * has to sit in a predicate that filters rows, because a value the query merely mentions is
 * not a value it searched for: `FROM logs-aws.* | EVAL label = "AssumeRole" | LIMIT 1` puts the
 * report's artifact in the query text while restricting nothing, and returns the first
 * arbitrary row of a required index. And the predicate has to constrain rows *to* that value
 * rather than away from it: `WHERE event.action != "AssumeRole"` filters on the report's
 * artifact to return everything that is not the report's evidence.
 *
 * A literal grounds the query when it equals an extracted IOC or stands as a term of its own in
 * the report text — or, for a pattern operator, when a required fragment of it does, since the
 * wildcards in `LIKE "*AssumeRole*"` are not in the report and the generation contract asks for
 * exactly that shape. A query written in another language (`QSTR`, `KQL`) grounds nothing at all:
 * its own syntax can widen the result in ways reading it as text cannot see.
 *
 * Where the predicate sits decides how much it has to carry. One grounded `WHERE` grounds a linear
 * pipeline, because its filters compose with `AND`; a `FORK` unions rows instead, so every branch
 * of one has to ground itself.
 *
 * It remains a value test rather than a semantic one: it establishes that the report constrains
 * the rows, not that the constraint is tight. A tautology disjoined onto a grounded comparison is
 * caught as an ungrounded `OR` branch, but a predicate that is grounded and still matches most of
 * the index is not something this can see.
 */
export const assertEsqlGroundedInReport = (
  query: string,
  { reportText, iocValues }: { reportText: string; iocValues: string[] }
): EsqlGroundedResult => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return { ok: false, reason: 'query failed to parse' };
  }

  const predicates = allFilterPredicates(root);
  if (predicates.length === 0) {
    return {
      ok: false,
      reason: 'query has no filtering predicate, so any row in scope would answer it',
    };
  }

  // Index patterns surface as `source` nodes, so a literal equal to one of them is the query
  // naming its own scope rather than the report.
  const sources = new Set<string>();
  Walker.walk(root, { visitSource: ({ name }) => sources.add(normalize(name)) });

  const haystack = normalize(reportText);
  const groundingIocs = new Set(iocValues.map(normalize).filter((value) => value.length > 0));

  const qualifies = (candidate: string, standalone: boolean): boolean => {
    const value = normalize(candidate);
    if (value.length < MIN_GROUNDING_LENGTH || sources.has(value)) {
      return false;
    }
    if (groundingIocs.has(value)) {
      return true;
    }
    return standalone ? appearsAsTerm(haystack, value) : haystack.includes(value);
  };

  const grounds = (operator: string, literal: string): boolean => {
    const standalone = !PATTERN_OPERATORS.has(operator);
    return groundingRequirements(operator, literal).every((alternatives) =>
      alternatives.some((candidate) => qualifies(candidate, standalone))
    );
  };

  if (isPipelineGrounded(root, grounds)) {
    return { ok: true };
  }

  // Deliberately permissive — it only chooses the wording of a rejection, never accepts one —
  // so a report value under any operator is treated as mentioned.
  const mentioned = predicates.some(
    (predicate) =>
      Walker.findAll(
        predicate,
        (node) => node.type === 'literal' && grounds('rlike', stripFraming(String(node.value)))
      ).length > 0
  );

  return {
    ok: false,
    reason: mentioned
      ? 'query carries a report value but no predicate searches for it (negated, or one alternative among ungrounded branches)'
      : 'query filters on no value drawn from the report (no matching IOC or report literal in a filtering predicate)',
  };
};
