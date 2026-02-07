/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { Correlation } from '../types';
import { getAnchors } from './get_anchors';

export async function getCorrelationIdentifiers({
  esClient,
  indices,
  startTime,
  endTime,
  kqlFilter,
  logger,
  maxSequences,
}: {
  esClient: IScopedClusterClient;
  indices: string[];
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  logger: Logger;
  maxSequences: number;
}): Promise<Correlation[]> {
  const anchors = await getAnchors({
    esClient,
    indices,
    startTime,
    endTime,
    kqlFilter,
    logger,
    maxSequences,
  });

  return anchors.map((anchor) => {
    const { correlation, '@timestamp': timestamp } = anchor;
    const start = moment(timestamp).subtract(1, 'hour').valueOf();
    const end = moment(timestamp).add(1, 'hour').valueOf();
    return {
      identifier: correlation,
      start,
      end,
    };
  });
}
