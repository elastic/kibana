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

export const timeRangeParseError = (from?: string, to?: string): ErrorResult => ({
  tool_result_id: getToolResultId(),
  type: ToolResultType.error,
  data: { message: `Unable to parse time range from "${from ?? ''}" to "${to ?? ''}".` },
});

export const parseTimeBound = (value: string, roundUp = false): Moment | undefined => {
  const parsed = dateMath.parse(value, roundUp ? { roundUp: true } : {});
  return parsed?.isValid() ? parsed : undefined;
};
