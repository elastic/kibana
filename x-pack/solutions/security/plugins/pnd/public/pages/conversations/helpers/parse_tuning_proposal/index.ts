/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndTuningPreview } from '../../../../components/backtest_comparison';
import type { PndTunableRuleChange } from '../../../../components/proposed_rule_change';
import * as i18n from './translations';

/**
 * The labels `watch_post_incident.yaml`'s `reason_apply_tuning` step writes immediately before each
 * machine-readable value, from Detection Watch **v4** on (finding R6).
 *
 * ⚠️ These are a contract with that YAML, pinned on both sides with literals: `@kbn/workflows` is
 * `group: platform` and cannot import this solution package, so there is no shared constant to
 * couple them. `watch_post_incident.test.ts` asserts the labels on the rendering side and
 * `index.test.ts` asserts them here. Changing one side alone does not throw — it silently drops
 * every row back to {@link readLegacyFields}, which is why both sides are tested, and why a label
 * is never "tidied" without moving both assertions in the same commit.
 *
 * The trailing colon is included but no trailing space is: liquid's folded scalars can leave more
 * than one space between a label and its value, so the reader skips whitespace instead of assuming
 * exactly one.
 */
export const TUNING_BACKTEST_AFTER_LABEL = 'Backtest alerts as-proposed:';
export const TUNING_BACKTEST_BEFORE_LABEL = 'Backtest alerts as-is:';
export const TUNING_CHANGE_LABEL =
  'Proposed change (enabled / investigation_fields / note / query only):';
export const TUNING_CURRENT_QUERY_LABEL = 'Rule query as-is:';
export const TUNING_RULE_ID_LABEL = 'Rule id:';
export const TUNING_RULE_NAME_LABEL = 'Rule name:';

/**
 * The two anchors v4 through v7 wrote, which v8 replaced.
 *
 * `query` joined `PND_TUNABLE_RULE_FIELDS` in v8, so the change label names it and no longer reads
 * as the older one did; and the backtest is now two counts the workflow measured itself rather than
 * one object the model was asked for. Both spellings are kept as anchored readers because a gate can
 * sit parked for 30 days: dropping them would push a row written last week onto {@link RULE_PATTERN},
 * which is a materially weaker basis for a write to a production rule. Reading them is not the same
 * as tolerating drift — the *current* label is what v8 renders, and that is the pair the two test
 * files pin.
 */
export const TUNING_CHANGE_LABEL_V4 =
  'Proposed change (enabled / investigation_fields / note only):';
export const TUNING_PREVIEW_LABEL = 'Backtest detail:';

/**
 * The rule as v3 and earlier named it: `… "Endpoint Security [Insights]" (id 8f0a…)` in the
 * reasoning, and `Apply a tuning to detection rule "Endpoint Security [Insights]" (8f0a…)?` in the
 * message. One pattern reads both, with the `id ` label optional.
 *
 * Kept only for rows parked **before** the anchored format landed — a gate can sit waiting for 30
 * days, so an upgrade does not retire the shape. It is the fragile reader the anchored labels
 * replace: it loses a present rule id when the name is empty, and it mis-captures a name that
 * contains quotes or parens.
 */
const RULE_PATTERN = /"([^"]{1,1024})"\s*\(\s*(?:id\s+)?([^)]{0,1024})\)/;

/** The label v3 and earlier put immediately before the change JSON. */
const LEGACY_CHANGE_MARKER = 'proposed change';

const WHITESPACE: ReadonlySet<string> = new Set([' ', '\f', '\n', '\r', '\t', '\v']);

const DIGITS: ReadonlySet<string> = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

/**
 * Code-unit offsets of `text` from `start`.
 *
 * Deliberately **not** a spread or `Array.from(string)`: both iterate code POINTS while the scans
 * below index code UNITS, so a single astral character — an emoji in an investigation guide is
 * enough — made the pre-R6 scan compute an end index short of the real one and lose the change.
 */
const offsetsFrom = (text: string, start: number): number[] =>
  Array.from({ length: Math.max(text.length - start, 0) }, (_, offset) => offset);

/** The first index at or after `from` that is not whitespace, or the end of `text`. */
const skipWhitespace = (text: string, from: number): number =>
  from + (offsetsFrom(text, from).find((offset) => !WHITESPACE.has(text[from + offset])) ?? 0);

interface ObjectScanState {
  depth: number;
  /** Index just past the closing brace, once the object has been closed. */
  end?: number;
  inString: boolean;
  isEscaped: boolean;
}

/**
 * The end of the JSON object starting at `start`, honouring quoted strings so a brace inside a
 * `note` cannot close the object early.
 */
const findObjectEnd = (text: string, start: number): number | undefined =>
  offsetsFrom(text, start).reduce<ObjectScanState>(
    (state, offset) => {
      if (state.end != null) {
        return state;
      }

      const character = text[start + offset];

      if (state.inString) {
        if (state.isEscaped) {
          return { ...state, isEscaped: false };
        }
        if (character === '\\') {
          return { ...state, isEscaped: true };
        }
        return character === '"' ? { ...state, inString: false } : state;
      }

      if (character === '"') {
        return { ...state, inString: true };
      }
      if (character === '{') {
        return { ...state, depth: state.depth + 1 };
      }
      if (character === '}') {
        const depth = state.depth - 1;
        return depth === 0 ? { ...state, depth, end: start + offset + 1 } : { ...state, depth };
      }

      return state;
    },
    { depth: 0, inString: false, isEscaped: false }
  ).end;

interface StringScanState {
  /** Index just past the closing quote, once the string has been closed. */
  end?: number;
  isEscaped: boolean;
}

/**
 * The end of the JSON string literal starting at `start`, so an escaped quote inside a rule name
 * cannot close it early. This is what makes a name like `Suspicious "powershell" activity`
 * recoverable at all.
 */
const findStringEnd = (text: string, start: number): number | undefined =>
  offsetsFrom(text, start + 1).reduce<StringScanState>(
    (state, offset) => {
      if (state.end != null) {
        return state;
      }

      const character = text[start + 1 + offset];

      if (state.isEscaped) {
        return { ...state, isEscaped: false };
      }
      if (character === '\\') {
        return { ...state, isEscaped: true };
      }

      return character === '"' ? { ...state, end: start + offset + 2 } : state;
    },
    { isEscaped: false }
  ).end;

/** The first index at or after `from` that is not a digit, or the end of `text`. */
const findDigitsEnd = (text: string, from: number): number => {
  const offsets = offsetsFrom(text, from);

  return from + (offsets.find((offset) => !DIGITS.has(text[from + offset])) ?? offsets.length);
};

/**
 * The end of the JSON number literal starting at `start`.
 *
 * An alert count is rendered by liquid's `| json` as a bare integer, and the sentence carrying it
 * ends in a period — so `Backtest alerts as-is: 95.` has to yield `95` and not `95.`, which does not
 * parse. The fractional part is therefore consumed only when a digit follows the dot. No exponent is
 * accepted: nothing the workflow writes needs one, and admitting one would only widen what a
 * mis-rendered value can be read back as.
 */
const findNumberEnd = (text: string, start: number): number | undefined => {
  const afterSign = text[start] === '-' ? start + 1 : start;
  const integerEnd = findDigitsEnd(text, afterSign);

  if (integerEnd === afterSign) {
    return undefined;
  }

  return text[integerEnd] === '.' && DIGITS.has(text[integerEnd + 1])
    ? findDigitsEnd(text, integerEnd + 1)
    : integerEnd;
};

/**
 * The end of the JSON object, string or number at `start`; anything else is not a value we wrote.
 *
 * A number is read because an alert count is one: `alert_count | json` renders `95`, and an
 * unmeasured side renders the string `"inconclusive"` instead — which is exactly why the count is
 * read as JSON rather than scraped, since `"inconclusive"` must never be reachable as a number.
 */
const findValueEnd = (text: string, start: number): number | undefined => {
  if (text[start] === '{') {
    return findObjectEnd(text, start);
  }
  if (text[start] === '"') {
    return findStringEnd(text, start);
  }

  return findNumberEnd(text, start);
};

/**
 * The JSON value the workflow rendered immediately after `label`.
 *
 * `undefined` when the label is absent (a row from an older watch version), when what follows is
 * not a JSON object or string (liquid renders an absent step output as `''`, so a degraded card
 * leaves the label followed by punctuation), or when the value does not parse.
 */
const readJsonAfterLabel = (text: string, label: string): unknown => {
  const labelIndex = text.indexOf(label);
  if (labelIndex === -1) {
    return undefined;
  }

  const start = skipWhitespace(text, labelIndex + label.length);
  const end = findValueEnd(text, start);
  if (end == null) {
    return undefined;
  }

  try {
    return JSON.parse(text.slice(start, end));
  } catch {
    // liquid rendered a partial object, or the model wrote prose where JSON was expected
    return undefined;
  }
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asNonEmptyString = (value: unknown): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : undefined;

  return trimmed != null && trimmed.length > 0 ? trimmed : undefined;
};

/**
 * The `change` object v3 and earlier rendered with liquid's `| json`, with no label of its own.
 *
 * Searched from the "proposed change" wording rather than from the start of the string, so a brace
 * in the model's own closing statement cannot be mistaken for the change.
 */
const parseLegacyChange = (reasoning: string): PndTunableRuleChange | undefined => {
  const markerIndex = reasoning.toLowerCase().indexOf(LEGACY_CHANGE_MARKER);
  const start = reasoning.indexOf('{', markerIndex >= 0 ? markerIndex : 0);

  if (start === -1) {
    return undefined;
  }

  const end = findObjectEnd(reasoning, start);
  if (end == null) {
    return undefined;
  }

  try {
    return asRecord(JSON.parse(reasoning.slice(start, end))) as PndTunableRuleChange | undefined;
  } catch {
    return undefined;
  }
};

export interface ParseTuningProposalParams {
  /** `PndProposalRow.message` — the gate's own question. */
  message: string;
  /** `PndProposalRow.reasoning` — a single string; the server drops `sections`. */
  reasoning: string;
}

/** Which carrier the fields below were read out of. */
export type TuningRecoverySource =
  /** The anchored `TUNING_*_LABEL` values the workflow wrote as JSON. No prose was re-parsed. */
  | 'anchored'
  /** A row parked by a pre-v4 Detection Watch, read back out of prose by {@link RULE_PATTERN}. */
  | 'legacy'
  /** Nothing was recoverable — normally a degraded card, where there is no draft to recover. */
  | 'none';

export interface ParsedTuningProposal {
  change?: PndTunableRuleChange;
  /**
   * The rule's query as it stands today, so a proposed rewrite can be read as a diff rather than as
   * a string on its own. The watch writes it from the rule it fetched, falling back to the query the
   * drafting agent claims to have started from — an approver cannot judge a rewrite without it.
   */
  currentQuery?: string;
  preview?: PndTuningPreview;
  /**
   * Always set, so a caller can state *how* the fields were obtained instead of treating a
   * prose-recovered rule id as being as trustworthy as one the workflow wrote as JSON.
   */
  recovery: TuningRecoverySource;
  ruleId?: string;
  ruleName?: string;
}

/** Fields recovered from one carrier; every one is optional and none is trusted. */
type RecoveredFields = Omit<ParsedTuningProposal, 'recovery'>;

/** A count anchor's value, but only when it really is a finite number. */
const asAlertCount = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const hasQueryRewrite = (change: PndTunableRuleChange | undefined): boolean =>
  typeof change?.query === 'string' && change.query.trim().length > 0;

interface ReadAnchoredPreviewParams {
  change: PndTunableRuleChange | undefined;
  /**
   * Whether any other anchored fact was recovered. A degraded card renders every count as
   * `"inconclusive"` too, and saying *why* there is no backtest for a proposal that does not exist
   * would explain the wrong absence: the missing thing is the draft, which the row already says.
   */
  hasDraft: boolean;
  reasoning: string;
}

/**
 * The backtest pair, read from the two count anchors a v8 watch writes.
 *
 * The watch measures both sides itself over one window anchored at the moment the incident was
 * contained, and renders each count with `| json` — so a real `0` arrives as the number `0` and an
 * unmeasured side arrives as the string `"inconclusive"`, which {@link asAlertCount} refuses. That
 * distinction is the point: **inconclusive is not zero**, and a surface that showed `0` for a preview
 * that never ran would be claiming the rewrite silences the rule.
 *
 * When neither side is a count the absence is *stated* rather than left blank, and the two reasons
 * are told apart, because they call for different reactions: a proposal that rewrites no query has
 * nothing to backtest by design, while a query rewrite with no counts means the preview did not run.
 * `undefined` — no synthesis at all — is for a row written before v8, which then falls through to the
 * {@link TUNING_PREVIEW_LABEL} object, and for a degraded card, which has no proposal to explain.
 */
const readAnchoredPreview = ({
  change,
  hasDraft,
  reasoning,
}: ReadAnchoredPreviewParams): PndTuningPreview | undefined => {
  const after = asAlertCount(readJsonAfterLabel(reasoning, TUNING_BACKTEST_AFTER_LABEL));
  const before = asAlertCount(readJsonAfterLabel(reasoning, TUNING_BACKTEST_BEFORE_LABEL));

  if (after != null || before != null) {
    return {
      ...(after != null ? { after: { alertCount: after } } : {}),
      ...(before != null ? { before: { alertCount: before } } : {}),
    };
  }

  if (!hasDraft || !reasoning.includes(TUNING_BACKTEST_BEFORE_LABEL)) {
    return undefined;
  }

  return {
    notMeasured: hasQueryRewrite(change)
      ? i18n.BACKTEST_INCONCLUSIVE
      : i18n.BACKTEST_NO_QUERY_CHANGE,
  };
};

/** The anchored labels: `JSON.parse` of a delimited value, with no pattern matching over prose. */
const readAnchoredFields = (reasoning: string): RecoveredFields => {
  const change = asRecord(
    readJsonAfterLabel(reasoning, TUNING_CHANGE_LABEL) ??
      readJsonAfterLabel(reasoning, TUNING_CHANGE_LABEL_V4)
  ) as PndTunableRuleChange | undefined;
  const currentQuery = asNonEmptyString(readJsonAfterLabel(reasoning, TUNING_CURRENT_QUERY_LABEL));
  const ruleId = asNonEmptyString(readJsonAfterLabel(reasoning, TUNING_RULE_ID_LABEL));
  const ruleName = asNonEmptyString(readJsonAfterLabel(reasoning, TUNING_RULE_NAME_LABEL));

  const preview =
    readAnchoredPreview({
      change,
      hasDraft: change != null || currentQuery != null || ruleId != null || ruleName != null,
      reasoning,
    }) ??
    (asRecord(readJsonAfterLabel(reasoning, TUNING_PREVIEW_LABEL)) as PndTuningPreview | undefined);

  return {
    ...(change != null ? { change } : {}),
    ...(currentQuery != null ? { currentQuery } : {}),
    ...(preview != null ? { preview } : {}),
    ...(ruleId != null ? { ruleId } : {}),
    ...(ruleName != null ? { ruleName } : {}),
  };
};

/** The pre-v4 prose, read from the reasoning first and the gate message second. */
const readLegacyFields = ({ message, reasoning }: ParseTuningProposalParams): RecoveredFields => {
  const [, reasoningName, reasoningId] = RULE_PATTERN.exec(reasoning) ?? [];
  const [, messageName, messageId] = RULE_PATTERN.exec(message) ?? [];

  const change = parseLegacyChange(reasoning);
  const ruleId = asNonEmptyString(reasoningId) ?? asNonEmptyString(messageId);
  const ruleName = asNonEmptyString(reasoningName) ?? asNonEmptyString(messageName);

  return {
    ...(change != null ? { change } : {}),
    ...(ruleId != null ? { ruleId } : {}),
    ...(ruleName != null ? { ruleName } : {}),
  };
};

/**
 * The rule, the change and the backtest that a `tune` proposal is asking to authorize.
 *
 * **Why the UI reads these out of a string at all** (finding R6): `PndProposalRow` carries no
 * `ruleId`, `ruleName` or `change`, and nothing in `pnd/server` ever reads
 * `steps.draft_tuning.output.structured_output`. `list_pending_pnd_gates` resolves only the gate's
 * timestamp-predecessor `output.reasoning`, `extract_reasoning_summary` reduces even that to one
 * string (security finding D3 drops `reasoning.sections`), and `build_proposal_rows` projects that
 * string. So the model's structured output is flattened into prose by the workflow and has to be
 * recovered here. The regex this file used to lead with existed because the structured output was
 * never being read — not because the model failed to produce it.
 *
 * From Detection Watch v4 the workflow renders each fact behind a stable label with a
 * `| json`-encoded value, so the primary read is `JSON.parse` of a delimited value. That is what
 * makes a rule name containing quotes, parens, colons or newlines recoverable, and what stops an
 * empty rule name from taking a present rule id down with it.
 *
 * From v8 the tuning is a real query change, so three more facts are anchored: the rule's query as it
 * stands, and one alert count per side of a backtest the **workflow** measured over a single window
 * anchored at containment. The counts replace the `preview` object the model used to be asked for and
 * could never produce, and they are read as JSON rather than scraped so that a measured `0` and an
 * `"inconclusive"` side stay distinguishable — see {@link readAnchoredPreview}.
 *
 * `RULE_PATTERN` survives as the fallback, not as the design: a gate can sit parked for 30 days, so
 * rows written by an older watch version are still pending after an upgrade. The two are never
 * mixed — a row that yields any anchored value is read as v4, because a deliberately blank anchored
 * field must not be overridden by a stale prose match. Which carrier was used is reported in
 * `recovery` rather than being invisible, so a surface can say that a rule id was recovered from
 * prose instead of presenting it as the workflow's own output.
 *
 * Nothing here is trusted: the rule id is model-authored and lands in an **editable** field, an
 * unparseable change is reported as missing rather than guessed at, and a field outside
 * `PND_TUNABLE_RULE_FIELDS` is kept so the dialog can show it as *will be rejected* — the server's
 * allow-list, not this reader, is the boundary.
 */
export const parseTuningProposal = ({
  message,
  reasoning,
}: ParseTuningProposalParams): ParsedTuningProposal => {
  const anchored = readAnchoredFields(reasoning);
  if (Object.keys(anchored).length > 0) {
    return { ...anchored, recovery: 'anchored' };
  }

  const legacy = readLegacyFields({ message, reasoning });

  return { ...legacy, recovery: Object.keys(legacy).length > 0 ? 'legacy' : 'none' };
};
