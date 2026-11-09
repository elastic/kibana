/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { getTopLogChangePoints } from '@kbn/signals-server';

export async function getToolHandler({
  esClient,
  start,
  end,
  index,
  kqlFilter,
  messageField,
}: {
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index: string;
  kqlFilter?: string;
  messageField: string;
}) {
  return getTopLogChangePoints({
    index,
    esClient,
    start,
    end,
    kqlFilter,
    messageField,
  });
}
