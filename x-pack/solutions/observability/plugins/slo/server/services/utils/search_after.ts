/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';

export const encodeSearchAfter = (key: AggregationsCompositeAggregateKey): string =>
  Buffer.from(JSON.stringify(key)).toString('base64');

export const decodeSearchAfter = (token: string): AggregationsCompositeAggregateKey | undefined => {
  try {
    return JSON.parse(
      Buffer.from(token, 'base64').toString('utf8')
    ) as AggregationsCompositeAggregateKey;
  } catch {
    return undefined;
  }
};
