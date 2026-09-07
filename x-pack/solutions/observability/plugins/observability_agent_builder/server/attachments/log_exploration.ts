/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type {
  LogExplorationData,
  LogExplorationPattern,
  LogExplorationRefinement,
  LogExplorationResult,
} from '../../common/log_exploration';
import {
  excludedPatterns,
  logExplorationDataSchema,
  MAX_PATTERNS,
} from '../../common/log_exploration';
import { OBSERVABILITY_LOG_EXPLORATION_ATTACHMENT_TYPE_ID } from '../../common';

const total = (values: number[]): number => values.reduce((sum, value) => sum + value, 0);

const signed = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

/**
 * Change between the first and second half of a pattern's sparkline. The user sees that series as a
 * ~30px picture and cannot read values off it, so this is the one thing about a row the view shows
 * but does not state. An odd middle bucket is dropped so the halves stay the same width.
 */
const halfOverHalfDelta = (sparkline: number[]): number | undefined => {
  if (sparkline.length < 2) {
    return undefined;
  }
  const half = Math.floor(sparkline.length / 2);
  return total(sparkline.slice(sparkline.length - half)) - total(sparkline.slice(0, half));
};

const share = (count: number, cutTotal: number): number =>
  cutTotal === 0 ? 0 : Math.round((count / cutTotal) * 100);

/**
 * What the table draws but never states: how concentrated the cut is, and which rows are moving.
 * Without this the only honest summary of the table is the table, which the user is already reading.
 */
const formatCutShape = (patterns: LogExplorationPattern[]): string => {
  const cutTotal = total(patterns.map((p) => p.count));
  const largest = patterns.reduce((best, p) => (p.count > best.count ? p : best), patterns[0]);
  const deltas = patterns.flatMap((p) => {
    const delta = halfOverHalfDelta(p.sparkline);
    return delta === undefined ? [] : [{ pattern: p.pattern, delta }];
  });

  const lines = [
    `Documents across these patterns: ${cutTotal} — the total for these rows only. Never present it`,
    `as the document count for the time range; patterns below the cut are not in it.`,
    `Largest pattern's share of that total: ${share(largest.count, cutTotal)}% ("${
      largest.pattern
    }")`,
  ];

  if (deltas.length) {
    const rising = deltas.filter(({ delta }) => delta > 0);
    const falling = deltas.filter(({ delta }) => delta < 0);
    lines.push(
      `Trend within the window: ${rising.length} rising, ${falling.length} falling, ${
        deltas.length - rising.length - falling.length
      } flat`
    );
    const steepestRise = rising.reduce(
      (best, entry) => (best === undefined || entry.delta > best.delta ? entry : best),
      undefined as { pattern: string; delta: number } | undefined
    );
    const steepestFall = falling.reduce(
      (best, entry) => (best === undefined || entry.delta < best.delta ? entry : best),
      undefined as { pattern: string; delta: number } | undefined
    );
    if (steepestRise) {
      lines.push(`Steepest rise: "${steepestRise.pattern}" (${signed(steepestRise.delta)})`);
    }
    if (steepestFall) {
      lines.push(`Steepest fall: "${steepestFall.pattern}" (${signed(steepestFall.delta)})`);
    }
  }

  return `Shape of this cut, computed from the rows above:\n${lines.join('\n')}`;
};

const formatPatternTable = (
  result: Extract<LogExplorationResult, { type: 'pattern-table' }>,
  excluded: string[]
): string => {
  const isExcluded = new Set(excluded);
  const remaining = result.patterns.filter((p) => !isExcluded.has(p.pattern));
  const cutTotal = total(remaining.map((p) => p.count));

  const rows = remaining.length
    ? remaining
        .map((p) => {
          const delta = halfOverHalfDelta(p.sparkline);
          const trend = delta === undefined ? '' : `, trend ${signed(delta)}`;
          return `- ${p.pattern} (count: ${p.count}, ${share(
            p.count,
            cutTotal
          )}% of this cut${trend})`;
        })
        .join('\n')
    : '(none remaining — every pattern in the current cut has been muted)';

  return (
    dedent(`
    View: log pattern table
    This is the TOP ${MAX_PATTERNS} patterns by document count, not every pattern in the logs. The
    query is a top-N cut, so more patterns almost certainly exist below it. Never say or imply that
    the logs contain only these, and never total these counts and present the result as the total
    document count. Muting a pattern promotes the next largest one into the cut.
    "trend" is the change between the first and second half of the window, read from that pattern's
    sparkline. The user sees the sparkline only as a small picture, so the trend and the share are
    yours to state; the name and the count are already in front of them.
    The ${remaining.length} patterns below are the ONLY ones you may discuss. That is the count of
    un-muted patterns — use it as written. Do NOT count the rows yourself, and do NOT compute it as
    ${MAX_PATTERNS} minus the number of muted patterns; muting refills the cut, so that subtraction
    is wrong:
  `) +
    `\n${rows}\n` +
    (remaining.length ? `\n${formatCutShape(remaining)}` : '')
  );
};

/** Index of the largest value, or -1 for an empty series. */
const peakIndex = (values: number[]): number =>
  values.reduce((best, value, index) => (best === -1 || value > values[best] ? index : best), -1);

/** Index of the biggest current-vs-baseline swing, by absolute size. The series are index-aligned. */
const movedMostIndex = (current: number[], baseline: number[]): number => {
  const length = Math.max(current.length, baseline.length);
  return Array.from({ length }, (_, index) => index).reduce(
    (best, index) =>
      best === -1 ||
      Math.abs((current[index] ?? 0) - (baseline[index] ?? 0)) >
        Math.abs((current[best] ?? 0) - (baseline[best] ?? 0))
        ? index
        : best,
    -1
  );
};

const bucketTime = (startMs: number, intervalMs: number, index: number): string =>
  new Date(startMs + index * intervalMs).toISOString();

/**
 * The model never receives the series, only these summary points, so the chart's shape has to be
 * stated for it — otherwise the only honest answer it can give about a volume change is the two
 * totals, which the user is already looking at.
 */
const formatHistogramShape = (
  result: Extract<LogExplorationResult, { type: 'volume-comparison' }>
): string => {
  const { current, baseline, intervalMs, startMs, baselineStartMs } = result.histogram;
  const currentPeak = peakIndex(current);
  const baselinePeak = peakIndex(baseline);
  const moved = movedMostIndex(current, baseline);

  const lines: string[] = [];

  if (currentPeak !== -1) {
    lines.push(
      `Busiest bucket in the current range: ${bucketTime(startMs, intervalMs, currentPeak)} (${
        current[currentPeak]
      } documents)`
    );
  }
  if (baselinePeak !== -1) {
    lines.push(
      `Busiest bucket in the baseline epoch: ${bucketTime(
        baselineStartMs,
        intervalMs,
        baselinePeak
      )} (${baseline[baselinePeak]} documents)`
    );
  }
  if (moved !== -1) {
    lines.push(
      `Bucket that moved most against the baseline: ${bucketTime(startMs, intervalMs, moved)}, ` +
        `${current[moved] ?? 0} now against ${baseline[moved] ?? 0} at the same offset in the ` +
        `baseline (${signed((current[moved] ?? 0) - (baseline[moved] ?? 0))})`
    );
  }

  return lines.join('\n');
};

const formatHistogram = (
  result: Extract<LogExplorationResult, { type: 'volume-comparison' }>
): string => {
  const { current, baseline, intervalMs } = result.histogram;
  const currentTotal = total(current);
  const baselineTotal = total(baseline);
  const change = currentTotal - baselineTotal;
  const percent =
    baselineTotal === 0
      ? '(no baseline documents to compare against)'
      : `${signed(Math.round((change / baselineTotal) * 1000) / 10)}%`;

  return (
    dedent(`
    View: log volume histogram, current range overlaid on the baseline epoch
    Bucket interval: ${intervalMs}ms across ${current.length} buckets
    Total documents in current range: ${currentTotal}
    Total documents in baseline epoch: ${baselineTotal}
    Change against the baseline: ${signed(change)} documents, ${percent}
  `) +
    `\n${formatHistogramShape(result)}\n` +
    dedent(`
    These points are computed from the full bucket series and are enough to describe the change.
    Do not assert a trend, a spike or a shape beyond what they state.
  `)
  );
};

const formatView = (data: LogExplorationData): string => {
  // The lens and its cache are written together, so they only disagree if a payload was hand-edited.
  if (data.view.type === 'pattern-table' && data.result.type === 'pattern-table') {
    return formatPatternTable(data.result, excludedPatterns(data.refinements));
  }
  if (data.view.type === 'volume-comparison' && data.result.type === 'volume-comparison') {
    return formatHistogram(data.result);
  }
  return `View: ${data.view.type} (no data)`;
};

/**
 * Refinements are stored uniformly but described one kind at a time. The exclusion wording in
 * particular is what stops the model reaching for a muted pattern when asked to summarize, so it
 * stays a hand-written sentence rather than a generic list of narrowings.
 */
const formatRefinements = (refinements: LogExplorationRefinement[]): string => {
  const excluded = excludedPatterns(refinements);
  const sections = [
    `MUTED PATTERNS (${excluded.length}) — the user dismissed these as noise. Never name them in an\n` +
      `answer, never include them in a summary, count or comparison, and never investigate them. You\n` +
      `may say how many are muted. They are listed here only so you can recognise and avoid them:\n` +
      (excluded.length ? excluded.map((pattern) => `- ${pattern}`).join('\n') : '(none)'),
  ];

  for (const refinement of refinements) {
    if (refinement.kind === 'only-pattern') {
      sections.push(
        `SCOPED TO ONE PATTERN — every number below counts only logs matching "${refinement.pattern}". Say so when you describe them.`
      );
    }
    if (refinement.kind === 'kql') {
      sections.push(`KQL filter applied to every view here: ${refinement.query}`);
    }
  }

  return sections.join('\n\n');
};

export function createLogExplorationAttachmentType(): AttachmentTypeDefinition<
  typeof OBSERVABILITY_LOG_EXPLORATION_ATTACHMENT_TYPE_ID,
  LogExplorationData
> {
  return {
    id: OBSERVABILITY_LOG_EXPLORATION_ATTACHMENT_TYPE_ID,
    // `attachment_read` is the only path that puts content in the model's context, and it returns
    // the raw payload unless the type is readonly — in which case it returns `format()` below.
    // Without this the muted-pattern and top-N framing never reach the model at all. The framework
    // enforces `readonly` only in the agent's own add/update tools, not in the state manager or the
    // content route, so the tool emit and the user's writes are unaffected.
    isReadonly: true,
    validate: (input) => {
      const parsed = logExplorationDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    // Re-read on every round, so refinements the user made between turns are visible to the model here.
    format: (attachment) => {
      const { data } = attachment;

      return {
        getRepresentation: () => ({
          type: 'text',
          value: dedent(`
            Interactive log exploration view. The user steers this view directly; the state below is
            their current filter state and overrides anything you established in earlier turns.

            Index: ${data.source.index}
            Message field: ${data.source.messageField}
            Active time range: ${data.source.timeRange.start} to ${data.source.timeRange.end}
            Baseline epoch: ${
              data.view.type === 'volume-comparison'
                ? `${data.view.baselineEpoch.start} to ${data.view.baselineEpoch.end}`
                : '(not set)'
            }

            HOW TO WRITE ABOUT THIS VIEW. The user changes the range, the baseline and the filters in
            the view itself, with no turn from you, and the view refetches. Your message cannot
            follow it. What that costs you depends on the shape of the message you are writing.

            A MESSAGE THAT ONLY RENDERS THE VIEW (a tool just produced it and you are presenting it):
            - Do not state the time range, the baseline epoch or the filter list. Write "over the
              selected window", "against the chosen baseline", "with the current filters". This
              covers durations mentioned in passing too: not "80 events in six hours", not "over the
              past day". The live picker, baseline selector and filter chips sit directly beneath
              your sentence, and will disagree with it the moment the user clicks.

            A PROSE-ONLY REPLY (no <render_attachment ... /> tag anywhere in it):
            - Say which range, baseline and filters the answer was computed from. Nothing beside
              that text can move, so naming them is what makes it a readable record later rather
              than an unattributed claim.

            A REPLY THAT ANALYSES AN EARLIER RESULT AND THEN RE-RENDERS THE VIEW:
            - Name the parameters only BEFORE the <render_attachment ... /> tag, and only as what
              your analysis was computed from — past tense, about the analysis, never about the
              view: "computed from the selected window, now-24h to now, as of this reading".
            - After the tag, name no range, baseline or filter at all. Anything below the view reads
              as a description of the live view above it, and the live view can move.

            IN EVERY CASE:
            - If the user asks outright what window, baseline or filters are in effect, answer with
              the literal values above.
            - The values above and the numbers below are a reading taken now, not a standing fact.
              Frame them that way ("as of this reading", "at the time of this summary"), and never
              promise they still match the view.
            - Prefer saying what the user cannot already see. Repeating a row, a count or a bar back
              to them is not an answer.

            WHEN TO RE-RENDER THIS VIEW. If your reply recommends something the user can do in the
            view — mute a pattern, investigate one, compare one against the baseline — end the reply
            by rendering it again, so the recommendation is one click away instead of a scroll away:

            <render_attachment id="${attachment.id}" />

            Do not re-render when your reply recommends nothing the view can act on. A second copy
            of a chart the user has just read is noise, and the re-render supersedes the earlier one.

            ${formatRefinements(data.refinements)}

            ${formatView(data)}
          `),
        }),
      };
    },
    getAgentDescription: () =>
      dedent(`
        An interactive log exploration view rendered in the conversation. It shows either a table of
        the top log patterns by document count, each with a trend sparkline, or log volume for the
        current time range overlaid on a user-chosen baseline epoch.

        The pattern table is a top-N cut, never the full set of patterns in the logs, so treat its
        rows as "the largest patterns" rather than "the patterns that exist".

        The user mutes noisy patterns, changes the time range and picks the baseline epoch directly
        in the view, without asking you. Every filter listed in the attachment narrows every view it
        offers. Always read the attachment's current state before answering questions about log
        patterns, and treat muted patterns as though they do not exist.

        Because the user changes those things without a turn from you, a message that renders the
        view must not restate the time range, the baseline epoch or the filters — say "the selected
        window", "the chosen baseline". The live values sit right below that sentence, so repeating
        them can only go stale. In a prose-only reply, where nothing beside the text can move, name
        the range, baseline and filters the answer came from. If a reply does both — analyses an
        earlier result and then re-renders the view — name them only above the render, as what the
        analysis was computed from. Either way, treat a number you quote from the view as a reading
        taken at that moment, and spend the message on what the view does not already say.

        When a reply recommends something the view can do — mute a pattern, investigate one, compare
        one against the baseline — end it by rendering the view again so the recommendation is one
        click away. Do not re-render when nothing you suggested is actionable there.
      `),
  };
}
