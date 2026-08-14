/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import dateMath from '@kbn/datemath';
import type { Moment } from 'moment';

type ParseTimeRangeResult =
  | { ok: true; min?: Moment; max?: Moment }
  | { ok: false; results: [ErrorResult] };

/**
 * Parses optional date-math `from`/`to` bounds and returns ready-to-return
 * tool results if either fails to parse. `max` is rounded up so an inclusive
 * calendar-date `to` (e.g. "2026-03-15") covers the whole day.
 */
export const parseTimeRangeOrError = ({
  from,
  to,
}: {
  from?: string;
  to?: string;
}): ParseTimeRangeResult => {
  const min = from !== undefined ? dateMath.parse(from) : undefined;
  const max = to !== undefined ? dateMath.parse(to, { roundUp: true }) : undefined;

  if ((from !== undefined && !min?.isValid()) || (to !== undefined && !max?.isValid())) {
    return {
      ok: false,
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.error,
          data: { message: `Unable to parse time range from "${from ?? ''}" to "${to ?? ''}".` },
        },
      ],
    };
  }

  return { ok: true, min, max };
};
