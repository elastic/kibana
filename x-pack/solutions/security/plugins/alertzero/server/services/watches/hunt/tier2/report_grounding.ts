/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ESQLAstNode,
  ESQLAstQueryExpression,
  ESQLFunction,
  ESQLList,
  ESQLLiteral,
} from '@elastic/esql';
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
 * branches of a `FORK` separate because they combine differently.
 *
 * Only the `WHERE` command qualifies. Everything else in a pipeline describes the shape of the
 * output rather than which rows reach it: an `EVAL` assignment, a `SORT` key, a `LIMIT`, a `GROK`
 * pattern, an index name — and the aggregation filter in `STATS c = COUNT(*) WHERE ... BY ...`,
 * which is worth spelling out because it reads like a filter and is not one. It filters the
 * aggregate, not the rows: `STATS c = COUNT(*) WHERE source.ip == "10.0.0.1" BY host.name` returns
 * a row for every host, holding `c = 0` where nothing matched. Counting it grounded let a query
 * pass while handing back groups the report never selected. Declining it costs nothing the
 * pipeline asks for, because the extraction contract tells the model to return row-level events
 * and not to aggregate.
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
    if (command.name === 'where') predicates.push(...command.args);
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

const columnNameOf = (node: ESQLAstNode): string | undefined =>
  !Array.isArray(node) && 'type' in node && node.type === 'column'
    ? node.name.toLowerCase()
    : undefined;

/**
 * Columns the query fills with a value of its own rather than reading from the document. An `EVAL`
 * whose definition mentions no column is a constant for every row, so a predicate comparing one
 * to the report's artifact is satisfied by every row in scope while reading as a hunt for it:
 *
 *     FROM logs-aws.* | EVAL label = "AssumeRole" | WHERE label == "AssumeRole" | LIMIT 1
 *
 * A column derived *from* a field is not in this set, because a predicate on one does narrow which
 * documents match — `EVAL lowered = TO_LOWER(user.name)` and a `GROK` capture both do — and the
 * generation contract invites that shape. Definitions are read in pipeline order so an alias
 * defined from another constant is itself constant, and a `RENAME` carries the property across.
 */
const collectConstantColumns = (
  query: ESQLAstQueryExpression,
  inherited: ReadonlySet<string>
): ReadonlySet<string> => {
  const constants = new Set(inherited);
  for (const command of query.commands) {
    if (command.name === 'rename') {
      for (const arg of command.args) {
        // `RENAME old AS new` parses as an `as` function, source first and target second.
        const assignment = asFunction(arg);
        if (!assignment || assignment.name !== 'as' || assignment.args.length < 2) continue;
        const source = columnNameOf(assignment.args[0]);
        const target = columnNameOf(assignment.args[1]);
        if (source && target && constants.has(source)) constants.add(target);
      }
      continue;
    }
    if (command.name !== 'eval') continue;
    for (const arg of command.args) {
      const assignment = asFunction(arg);
      if (!assignment || assignment.name !== '=' || assignment.args.length < 2) continue;
      const name = columnNameOf(assignment.args[0]);
      if (!name) continue;
      let readsDocument = false;
      Walker.walk(assignment.args[1], {
        visitColumn: (column) => {
          if (!constants.has(column.name.toLowerCase())) readsDocument = true;
        },
      });
      if (!readsDocument) constants.add(name);
    }
  }
  return constants;
};

/**
 * Whether a comparison reads a value out of the document it is deciding on.
 *
 * Stated this way round on purpose. Asking instead which columns disqualify a comparison leaves
 * every shape nobody thought of grounded, and each round of review has found one more: a metadata
 * column restating the scope the hunt already fixed, a column the query filled with a constant,
 * and `WHERE "AssumeRole" == "AssumeRole"`, which names no column at all and so passes any
 * rejection list while matching every row. A comparison that reads nothing from the document
 * cannot distinguish documents, whatever value it carries.
 *
 * The whole comparison is searched, so a field wrapped in a function still counts and an alias
 * wrapped in one is still refused.
 */
const readsTheDocument = (
  comparison: ESQLFunction,
  constantColumns: ReadonlySet<string>
): boolean => {
  let found = false;
  Walker.walk(comparison, {
    visitColumn: (column) => {
      const name = column.name.toLowerCase();
      if (!METADATA_COLUMNS.has(name) && !constantColumns.has(name)) found = true;
    },
  });
  return found;
};

const LIKE_WILDCARDS = /[*?]+/;
/** Wildcards and anchors a pattern may wrap its core in: they widen where it matches, not what. */
const REGEXP_SURROUND = /^[\^]?(?:\.[*+?])*|(?:\.[*+?])*\$?$/g;
/** Anything left in the core that gives regex syntax a say in what the core matches. */
const REGEXP_METACHARACTER = /[.*+?()[\]{}^$|]/;

/**
 * The core of one regular-expression alternative: the text every row it matches has to contain,
 * or nothing when this cannot tell.
 *
 * Deliberately a whitelist. The question "which metacharacters can make a fragment optional?" has
 * been answered wrongly three times — alternation, then quantifiers, then a character class, each
 * found one review round after the last — because splitting a pattern on its metacharacters reads
 * whatever sits between them as required, and regex syntax has many ways to say it is not:
 * `(AssumeRole)?`, `AssumeRole{0,2}` and `[AssumeRole]+` all name the artifact and match rows
 * without it. So rather than enumerate those, this accepts one shape and refuses the rest: a
 * literal core, optionally wrapped in anchors and `.*`-style wildcards, which is what the
 * generation contract asks for when it asks for a tight pattern derived from a concrete artifact.
 * A pattern doing anything else grounds nothing and keeps the non-executable placeholder.
 */
const requiredRegexpCore = (alternative: string): string[] => {
  const pattern = alternative.replace(REGEXP_SURROUND, '');
  let core = '';
  for (let at = 0; at < pattern.length; at += 1) {
    const character = pattern[at];
    if (character === '\\') {
      // An escaped punctuation character is that character: `evil\.example\.com` is a domain from
      // the report, not a pattern over it. Escaping a letter or digit makes a character class or a
      // backreference instead, which is regex syntax deciding what matches.
      const escaped = pattern[at + 1];
      if (!escaped || /[A-Za-z0-9]/.test(escaped)) return [];
      core += escaped;
      at += 1;
      continue;
    }
    if (REGEXP_METACHARACTER.test(character)) return [];
    core += character;
  }
  return core.length > 0 ? [core] : [];
};

/**
 * What a literal has to match for the operator reading it to be grounded, expressed as a list
 * of alternatives each of which needs one grounded candidate.
 *
 * A `LIKE`/`RLIKE` pattern is a report artifact plus metacharacters the report does not contain,
 * so comparing the pattern whole rejects a query that does search for the artifact — and a tight
 * pattern derived from an artifact is a shape the generation contract explicitly asks for.
 * Recognising the artifact inside the pattern is what lets such a query through.
 *
 * Two places a candidate is *optional* rather than required, and each gets the `OR` rule because
 * each is the `OR` problem written inside a string:
 *
 * - a regular expression's alternation, so `|` splits the pattern into alternatives that must
 *   each be grounded;
 * - a full-text match's terms, which are ORed by default, so each term has to be grounded. A term
 *   too short for this gate to judge is not excused from that: it is still a term Elasticsearch
 *   matches on, so `MATCH(message, "AssumeRole up")` returns documents holding only `up`, and
 *   judging the predicate on the one term that can be read counted those as the report's evidence.
 *   Every term is required and `MIN_GROUNDING_LENGTH` decides whether it can be met, which costs
 *   a match on short tokens alone — `MATCH(process.command_line, "net use")` keeps the
 *   placeholder — and costs nothing that can be verified.
 *
 * `LIKE` needs neither the alternation rule nor `RLIKE`'s whitelist: its only wildcards are `*`
 * for any sequence and `?` for exactly one character, so every fragment between them is text the
 * matching rows contain.
 */
const groundingRequirements = (operator: string, literal: string): string[][] => {
  if (operator === 'like') {
    return [[literal, ...literal.split(LIKE_WILDCARDS)]];
  }
  if (operator === 'rlike') {
    return literal.split('|').map(requiredRegexpCore);
  }
  if (FULL_TEXT_FUNCTIONS.has(operator)) {
    const terms = literal.split(/\s+/).filter((term) => term.length > 0);
    // A literal with no term asks for nothing, and an empty requirement list is satisfied by
    // everything, so it has to fail here rather than pass vacuously.
    return terms.length > 0 ? terms.map((term) => [term]) : [[]];
  }
  return [[literal]];
};

/**
 * A literal as Elasticsearch will receive it. A string literal carries both its source text and
 * its unescaped value, and only the second is what gets matched: the escapes an ES|QL string needs
 * to express `\.` are not part of the value, and reading the source text makes a literal dot in a
 * domain look like a wildcard.
 */
const valueOf = (literal: ESQLLiteral): string =>
  stripFraming(String('valueUnquoted' in literal ? literal.valueUnquoted : literal.value));

const literalsOf = (args: ESQLAstNode[]): string[] =>
  args.flatMap((arg) =>
    !Array.isArray(arg) && 'type' in arg && arg.type === 'literal' ? [valueOf(arg)] : []
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

interface GroundingRules {
  /** Whether a literal read by this operator is a value drawn from the report. */
  grounds: (operator: string, literal: string) => boolean;
  /** Columns the query populated itself, so far in this pipeline. */
  constantColumns: ReadonlySet<string>;
}

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
  rules: GroundingRules
): boolean => {
  if (Array.isArray(node)) {
    return node.some((child) => isPositivelyGrounded(child, rules));
  }
  const fn = asFunction(node);
  // A bare column, literal or list constrains nothing by itself.
  if (!fn) return false;

  const operator = fn.name.toLowerCase();
  if (operator === 'and') return fn.args.some((arg) => isPositivelyGrounded(arg, rules));
  if (operator === 'or') return fn.args.every((arg) => isPositivelyGrounded(arg, rules));
  if (NEGATING_OPERATORS.has(operator) || QUERY_STRING_FUNCTIONS.has(operator)) return false;
  if (!POSITIVE_MATCH_OPERATORS.has(operator) && !FULL_TEXT_FUNCTIONS.has(operator)) {
    // Range comparisons and everything else: a report value under `>` is a threshold, not a
    // search for the artifact.
    return false;
  }
  if (!readsTheDocument(fn, rules.constantColumns)) return false;

  const { grounds } = rules;
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
  grounds: GroundingRules['grounds'],
  inheritedConstants: ReadonlySet<string> = new Set()
): boolean => {
  const { predicates, forks } = collectPipelineFilters(query);
  const constantColumns = collectConstantColumns(query, inheritedConstants);
  // A predicate outside the fork applies to the union, so it grounds the branches too.
  if (predicates.some((predicate) => isPositivelyGrounded(predicate, { grounds, constantColumns })))
    return true;
  return forks.some(
    (branches) =>
      branches.length > 0 &&
      branches.every((branch) => isPipelineGrounded(branch, grounds, constantColumns))
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
 * of one has to ground itself. And the comparison has to read the document it decides on: a column
 * the query filled with a constant, or no column at all, matches every row while reading as a hunt
 * for the value it carries.
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

  // Deliberately permissive — it only chooses the wording of a rejection, never accepts one — so
  // every literal is read under the loosest rule there is, `LIKE`, which keeps each fragment a
  // wildcard leaves behind and asks no more of it than that the report contain it.
  const mentioned = predicates.some((predicate) => {
    let carries = false;
    Walker.walk(predicate, {
      visitLiteral: (literal) => {
        if (grounds('like', valueOf(literal))) carries = true;
      },
    });
    return carries;
  });

  return {
    ok: false,
    reason: mentioned
      ? 'query carries a report value but no predicate searches the document for it (negated, compared against a value the query supplied itself, or one alternative among ungrounded branches)'
      : 'query filters on no value drawn from the report (no matching IOC or report literal in a filtering predicate)',
  };
};
