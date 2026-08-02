/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FormatSparklineHourParams {
  /** Epoch milliseconds at the start of the hour, UTC — the bucket's own `time`. */
  time: number;
  /** An IANA zone, so the analyst reads the hour on their own clock rather than in UTC. */
  timeZone: string;
}

/**
 * The `HH:mm` header on a sparkline tooltip.
 *
 * A 24-hour clock regardless of locale (`hourCycle: 'h23'`), because the series spans a full day and
 * a header reading `2:00` for both 02:00 and 14:00 would make the busiest hour unidentifiable. The
 * zone is a parameter rather than read here so the caller resolves it once per card.
 */
export const formatSparklineHour = ({ time, timeZone }: FormatSparklineHourParams): string =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone,
  }).format(time);
