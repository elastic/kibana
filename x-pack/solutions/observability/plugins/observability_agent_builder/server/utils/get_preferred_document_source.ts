/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
import {
  getPreferredBucketSizeAndDataSource,
  getBucketSize,
} from '@kbn/apm-data-access-plugin/common';

/**
 * Gets the preferred document source based on groupBy, filter, and data availability.
 *
 * Uses getDocumentSources to determine which document types have data for the given
 * filter and groupBy field. This automatically handles:
 * - ServiceTransactionMetric: Most efficient, but only has service.name, service.environment, transaction.type
 * - TransactionMetric: Has more dimensions (transaction.*, host.*, container.*, kubernetes.*, cloud.*, faas.*, etc.)
 * - TransactionEvent: Raw transaction docs, fallback when metrics don't have required fields
 */
export async function getPreferredDocumentSource({
  apmDataAccessServices,
  start,
  end,
  groupBy,
  kqlFilter,
}: {
  apmDataAccessServices: ApmDataAccessServices;
  start: number;
  end: number;
  groupBy: string;
  kqlFilter?: string;
}) {
  const kueryParts: string[] = [];
  if (kqlFilter) {
    kueryParts.push(kqlFilter);
  }
  kueryParts.push(`${groupBy}: *`);
  const kuery = kueryParts.join(' AND ');

  const documentSources = await apmDataAccessServices.getDocumentSources({
    start,
    end,
    kuery,
  });

  const { bucketSize } = getBucketSize({
    start,
    end,
    numBuckets: 100,
  });

  const { source } = getPreferredBucketSizeAndDataSource({
    sources: documentSources,
    bucketSizeInSeconds: bucketSize,
  });

  return source;
}
