/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { encode } from '@kbn/rison';
import { URL_PARAM_KEY } from '../hooks/constants';
import type { AbsoluteTimeRange, RelativeTimeRange } from '../store/inputs/model';

const isRelativeDate = (date: string): boolean => date.trim().startsWith('now');

const toIsoString = (date: string, roundUp = false): string =>
  dateMath.parse(date, { roundUp })?.toISOString() ?? '';

/**
 * Builds the global time range for a page URL. Date-math bounds (e.g. `now-30d`) produce a
 * relative range resolved against the current time; otherwise the bounds are used as absolute dates.
 */
export const getGlobalTimerange = ({
  from,
  to,
}: {
  from: string;
  to: string;
}): AbsoluteTimeRange | RelativeTimeRange => {
  if (!isRelativeDate(from) && !isRelativeDate(to)) {
    return { kind: 'absolute', from, to };
  }
  return {
    kind: 'relative',
    fromStr: from,
    toStr: to,
    from: toIsoString(from),
    to: toIsoString(to, true),
  };
};

/** Rison-encodes {@link getGlobalTimerange} as the value of the `timerange` URL parameter. */
export const encodeGlobalTimerangeUrlParam = (timeRange: { from: string; to: string }): string =>
  encode({ global: { [URL_PARAM_KEY.timerange]: getGlobalTimerange(timeRange) } });
