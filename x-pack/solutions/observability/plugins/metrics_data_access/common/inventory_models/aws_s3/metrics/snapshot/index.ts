/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { s3BucketSize } from './s3_bucket_size';
import { s3TotalRequests } from './s3_total_requests';
import { s3NumberOfObjects } from './s3_number_of_objects';
import { s3DownloadBytes } from './s3_download_bytes';
import { s3UploadBytes } from './s3_upload_bytes';
import type { MetricConfigMap } from '../../../shared/metrics/types';

export const snapshot = {
  s3BucketSize,
  s3NumberOfObjects,
  s3TotalRequests,
  s3UploadBytes,
  s3DownloadBytes,
} satisfies MetricConfigMap;

export type S3Aggregations = typeof snapshot;
