/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_MESSAGE } from '@kbn/apm-types';
import type { JsErrorGroup } from '../../../../common/types/errors';
import { toLastSeen } from '../../../lib/helpers/aggregations';
import { NO_STACKTRACE, NO_TYPE } from './search_request';
import type { ErrorsAggregations, MessageAggregation } from './search_response';

const toMessage = ({ hits }: MessageAggregation): string | null => {
  const message = hits.hits[0]?.fields?.[EXCEPTION_MESSAGE]?.[0];
  return typeof message === 'string' ? message : null;
};

/** Whether the search left out less frequent groups. */
export const toHasMoreErrors = (aggregations?: ErrorsAggregations): boolean => {
  return (aggregations?.inEnvironment.exceptions.groups.sum_other_doc_count ?? 0) > 0;
};

/** Maps the error groups, most frequent first; missing aggregations map to no groups. */
export const toJsErrors = (aggregations?: ErrorsAggregations): JsErrorGroup[] => {
  const buckets = aggregations?.inEnvironment.exceptions.groups.buckets ?? [];
  return buckets.map(({ key: [type, stacktrace], doc_count: count, message, lastSeen }) => {
    return {
      type: type === NO_TYPE ? null : type,
      stacktrace: stacktrace === NO_STACKTRACE ? null : stacktrace,
      message: toMessage(message),
      count,
      lastSeen: toLastSeen(lastSeen.value),
    };
  });
};
