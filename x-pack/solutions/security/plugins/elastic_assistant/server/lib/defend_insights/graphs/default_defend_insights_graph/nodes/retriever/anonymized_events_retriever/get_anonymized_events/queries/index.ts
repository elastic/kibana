/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { getFileEventsQuery } from './file_events';

export function getQuery(
  type: DefendInsightType,
  options: { endpointIds: string[]; size?: number; gte?: DateMath; lte?: DateMath }
): SearchRequest {
  if (type === DefendInsightType.Enum.incompatible_antivirus) {
    const { endpointIds, size, gte, lte } = options;

    return getFileEventsQuery({
      endpointIds,
      size,
      gte,
      lte,
    });
  }

  throw new Error('Invalid defend insight type');
}
