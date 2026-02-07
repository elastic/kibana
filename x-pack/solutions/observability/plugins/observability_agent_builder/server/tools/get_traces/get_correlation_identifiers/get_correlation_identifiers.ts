/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  return anchors.map((anchor) => anchor.correlation);
}
