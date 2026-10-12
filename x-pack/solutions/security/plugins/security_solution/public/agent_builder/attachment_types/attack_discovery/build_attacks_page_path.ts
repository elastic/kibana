/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { URL_PARAM_KEY } from '../../../common/hooks/constants';
import { buildPageTimerange, encodePageParam } from '../grouped_attachments';

const quoteKqlValue = (value: string): string => `"${value.replace(/["\\]/g, '\\$&')}"`;

/** The Attacks page filtered to the given attacks, over a window around `createdAt`. */
export const buildAttacksPagePath = (attackIds: readonly string[], createdAt: string): string => {
  const query = encode({
    language: 'kuery',
    query: `_id: (${attackIds.map(quoteKqlValue).join(' or ')})`,
  });

  return [
    [URL_PARAM_KEY.appQuery, query],
    [URL_PARAM_KEY.timerange, buildPageTimerange(createdAt)],
  ]
    .map(([key, value], index) => `${index === 0 ? '?' : '&'}${key}=${encodePageParam(value)}`)
    .join('');
};
