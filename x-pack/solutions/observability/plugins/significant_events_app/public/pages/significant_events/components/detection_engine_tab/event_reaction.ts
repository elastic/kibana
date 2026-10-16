/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ActivityEntry,
  EngineEvent,
  EventOpenWindow,
} from '@kbn/significant-events-detection-engine-plugin/common';
import { DISMISSAL_LABELS } from './labels';
import { formatDuration, formatTime } from './format';

const MINUTE_MS = 60_000;
/** Raised this long after its minute closed, the engine was catching up rather than live. */
const CATCH_UP_AFTER_MS = 15 * MINUTE_MS;

/** How fast the engine raised one episode of an event, as epoch milliseconds. */
export interface IEventReaction {
  /** Start of the first minute that was above normal. */
  startedAt: number;
  /** When that minute ended; nothing can count it before then. */
  minuteEndAt: number;
  /** When the run that raised it started. */
  runStartedAt?: number;
  raisedAt?: number;
  publishedAt?: number;
  /** True when it was raised while the engine caught up on past minutes. */
  isCatchUp: boolean;
}

function firstEntryAfter({
  activity,
  after,
  matches,
}: {
  activity: ActivityEntry[];
  after: number;
  matches: (entry: ActivityEntry) => boolean;
}): number | undefined {
  const times = activity
    .filter(matches)
    .map((entry) => Date.parse(entry['@timestamp']))
    .filter((time) => time >= after);
  return times.length > 0 ? Math.min(...times) : undefined;
}

/**
 * The reaction times of one open window. Windows stored before the engine recorded these times
 * fall back to the activity log, which holds the same moments.
 */
export function reactionOf({
  window,
  activity = [],
}: {
  window: EventOpenWindow;
  activity?: ActivityEntry[];
}): IEventReaction {
  const startedAt = Date.parse(window.from);
  const minuteEndAt = startedAt + MINUTE_MS;
  const raisedAt = window.raised_at
    ? Date.parse(window.raised_at)
    : firstEntryAfter({
        activity,
        after: startedAt,
        matches: (entry) =>
          entry.step === 'state' && (entry.action === 'opened' || entry.action === 'reopened'),
      });
  const publishedAt = window.published_at
    ? Date.parse(window.published_at)
    : raisedAt === undefined
    ? undefined
    : firstEntryAfter({
        activity,
        after: raisedAt,
        matches: (entry) => entry.step === 'publish' && entry.action === 'published',
      });
  return {
    startedAt,
    minuteEndAt,
    runStartedAt: window.run_started_at ? Date.parse(window.run_started_at) : undefined,
    raisedAt,
    publishedAt,
    isCatchUp: raisedAt !== undefined && raisedAt - minuteEndAt > CATCH_UP_AFTER_MS,
  };
}

/** The latest open window of an event, the one its status describes. */
export function latestWindow(event: EngineEvent): EventOpenWindow | undefined {
  return event.open_windows[event.open_windows.length - 1];
}

/** Milliseconds from the problem starting to the event being raised, when known. */
export function timeToRaise(event: EngineEvent): number | undefined {
  const window = latestWindow(event);
  if (!window?.raised_at) {
    return undefined;
  }
  return Date.parse(window.raised_at) - Date.parse(window.from);
}

/** Median time to raise over live (not catch-up) episodes raised since `since`. */
export function medianTimeToRaise({
  events,
  since,
}: {
  events: EngineEvent[];
  since: number;
}): { medianMs: number; fastestMs: number; slowestMs: number; count: number } | undefined {
  const durations = events
    .flatMap((event) => event.open_windows)
    .map((window) => reactionOf({ window }))
    .filter(
      (reaction): reaction is IEventReaction & { raisedAt: number } =>
        reaction.raisedAt !== undefined && reaction.raisedAt >= since && !reaction.isCatchUp
    )
    .map((reaction) => reaction.raisedAt - reaction.startedAt)
    .sort((a, b) => a - b);
  if (durations.length === 0) {
    return undefined;
  }
  const middle = Math.floor(durations.length / 2);
  return {
    medianMs:
      durations.length % 2 === 0
        ? (durations[middle - 1] + durations[middle]) / 2
        : durations[middle],
    fastestMs: durations[0],
    slowestMs: durations[durations.length - 1],
    count: durations.length,
  };
}

/** What the status means for this event right now, in one sentence. */
export function describeStatus({
  event,
  quietPeriodBuckets,
}: {
  event: EngineEvent;
  quietPeriodBuckets: number;
}): string {
  const window = latestWindow(event);
  const firing = event.members.filter((member) => !member.healthy).length;
  if (event.status === 'active') {
    return i18n.translate('xpack.significantEventsApp.detectionEngine.status.activeDetail', {
      defaultMessage:
        '{firing} of {total} {total, plural, one {signal is} other {signals are}} still above normal. It starts recovering when every signal is back to normal.',
      values: { firing, total: event.members.length },
    });
  }
  if (event.status === 'recovering') {
    const streak = Math.min(...event.members.map((member) => member.healthy_streak));
    return i18n.translate('xpack.significantEventsApp.detectionEngine.status.recoveringDetail', {
      defaultMessage:
        'Every signal is back to normal. It closes after {quiet} healthy minutes in a row ({streak} so far), and goes back to active if a signal fires again.',
      values: { quiet: quietPeriodBuckets, streak: Number.isFinite(streak) ? streak : 0 },
    });
  }
  const openFor =
    window?.to !== undefined ? formatDuration(Date.parse(window.to) - Date.parse(window.from)) : '';
  const closedAt = event.closed_at ? formatTime(event.closed_at) : '';
  if (event.close_reason === 'operator') {
    return i18n.translate('xpack.significantEventsApp.detectionEngine.status.closedOperator', {
      defaultMessage:
        'Closed by a person at {time} after {openFor}. It opens again if the problem returns.',
      values: { time: closedAt, openFor },
    });
  }
  if (event.close_reason === 'dismissed') {
    return i18n.translate('xpack.significantEventsApp.detectionEngine.status.closedDismissed', {
      defaultMessage:
        'Dismissed as {reason} at {time}. It stays quiet until the problem gets worse than when it was dismissed.',
      values: {
        reason: event.dismissal ? DISMISSAL_LABELS[event.dismissal.reason] : '',
        time: closedAt,
      },
    });
  }
  return i18n.translate('xpack.significantEventsApp.detectionEngine.status.closedRecovered', {
    defaultMessage:
      'Recovered at {time} after {openFor}: every signal stayed normal for {quiet} minutes. It opens again as a new occurrence if the problem returns.',
    values: { time: closedAt, openFor, quiet: quietPeriodBuckets },
  });
}
