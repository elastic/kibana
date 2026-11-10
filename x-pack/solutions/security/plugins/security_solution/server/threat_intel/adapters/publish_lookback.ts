/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MS_PER_DAY = 86_400_000;

/** Independent of the Hunt Watch candidate lookback and the content retention window. */
export const DEFAULT_REPORT_PUBLISH_LOOKBACK_DAYS = 30;

/**
 * True only when the entry is strictly older than the lookback. A missing or unparseable
 * date is kept: the feed gave no usable date, so there is nothing to judge it by.
 */
export const isPublishedBeforeLookback = (
  publishedAtIso: string | undefined,
  now: Date,
  lookbackDays: number = DEFAULT_REPORT_PUBLISH_LOOKBACK_DAYS
): boolean => {
  if (publishedAtIso === undefined) return false;
  const publishedMs = Date.parse(publishedAtIso);
  if (Number.isNaN(publishedMs)) return false;
  return publishedMs < now.getTime() - lookbackDays * MS_PER_DAY;
};
