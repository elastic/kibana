/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';

import {
  AI_IS_CURRENTLY_ANALYZING,
  AI_IS_CURRENTLY_ANALYZING_FROM,
  AI_IS_CURRENTLY_ANALYZING_RANGE,
} from '../../translations';

export const getLoadingMessage = ({
  alertsCount,
  end,
  start,
}: {
  alertsCount: number;
  end?: string | null;
  start?: string | null;
}): string => {
  if (start === DEFAULT_START && end === DEFAULT_END) {
    return AI_IS_CURRENTLY_ANALYZING(alertsCount);
  }

  if (end != null && start != null) {
    return AI_IS_CURRENTLY_ANALYZING_RANGE({ alertsCount, end, start });
  } else if (start != null) {
    return AI_IS_CURRENTLY_ANALYZING_FROM({ alertsCount, from: start });
  } else {
    return AI_IS_CURRENTLY_ANALYZING(alertsCount);
  }
};
