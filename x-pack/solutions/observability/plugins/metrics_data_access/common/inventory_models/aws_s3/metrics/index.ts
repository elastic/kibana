/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { awsS3BucketSize } from './tsvb/aws_s3_bucket_size';
import { awsS3TotalRequests } from './tsvb/aws_s3_total_requests';
import { awsS3NumberOfObjects } from './tsvb/aws_s3_number_of_objects';
import { awsS3DownloadBytes } from './tsvb/aws_s3_download_bytes';
import { awsS3UploadBytes } from './tsvb/aws_s3_upload_bytes';
import { MetricsCatalog } from '../../shared/metrics/metrics_catalog';
import type { S3Aggregations } from './snapshot';
import type { InventoryMetricsConfig } from '../../shared/metrics/types';

export const metrics: InventoryMetricsConfig<S3Aggregations> = {
  tsvb: {
    awsS3BucketSize,
    awsS3TotalRequests,
    awsS3NumberOfObjects,
    awsS3DownloadBytes,
    awsS3UploadBytes,
  },
  requiredTsvb: [
    'awsS3BucketSize',
    'awsS3NumberOfObjects',
    'awsS3TotalRequests',
    'awsS3DownloadBytes',
    'awsS3UploadBytes',
  ],
  getAggregations: async (args) => {
    const { snapshot } = await import('./snapshot');
    const catalog = new MetricsCatalog(snapshot, args?.schema);
    return catalog;
  },
  getWaffleMapTooltipMetrics: () => [
    's3BucketSize',
    's3NumberOfObjects',
    's3TotalRequests',
    's3UploadBytes',
    's3DownloadBytes',
  ],
  defaultSnapshot: 's3BucketSize',
  defaultTimeRangeInSeconds: 86400 * 7, // 7 days
};
