/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MlDatafeedStats,
  MlJob,
  MlJobStats,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { MlJobMetric } from '../types';

export interface GetJobCorrelations {
  stat: MlJobStats;
  jobDetail: MlJob | undefined;
  datafeed: MlDatafeedStats | undefined;
}

export const getJobCorrelations = ({
  stat,
  jobDetail,
  datafeed,
}: GetJobCorrelations): MlJobMetric => {
  return {
    job_id: stat.job_id,
    open_time: stat.open_time,
    create_time: jobDetail?.create_time,
    finished_time: jobDetail?.finished_time,
    state: stat.state,
    data_counts: {
      bucket_count: stat.data_counts.bucket_count,
      empty_bucket_count: stat.data_counts.empty_bucket_count,
      input_bytes: stat.data_counts.input_bytes,
      input_record_count: stat.data_counts.input_record_count,
      last_data_time: stat.data_counts.last_data_time,
      processed_record_count: stat.data_counts.processed_record_count,
    },
    model_size_stats: {
      bucket_allocation_failures_count: stat.model_size_stats.bucket_allocation_failures_count,
      memory_status: stat.model_size_stats.memory_status,
      model_bytes: stat.model_size_stats.model_bytes,
      model_bytes_exceeded: stat.model_size_stats.model_bytes_exceeded,
      model_bytes_memory_limit: stat.model_size_stats.model_bytes_memory_limit,
      peak_model_bytes: stat.model_size_stats.peak_model_bytes,
    },
    timing_stats: {
      average_bucket_processing_time_ms: stat.timing_stats.average_bucket_processing_time_ms,
      bucket_count: stat.timing_stats.bucket_count,
      exponential_average_bucket_processing_time_ms:
        stat.timing_stats.exponential_average_bucket_processing_time_ms,
      exponential_average_bucket_processing_time_per_hour_ms:
        stat.timing_stats.exponential_average_bucket_processing_time_per_hour_ms,
      maximum_bucket_processing_time_ms: stat.timing_stats.maximum_bucket_processing_time_ms,
      minimum_bucket_processing_time_ms: stat.timing_stats.minimum_bucket_processing_time_ms,
      total_bucket_processing_time_ms: stat.timing_stats.total_bucket_processing_time_ms,
    },
    datafeed: {
      datafeed_id: datafeed?.datafeed_id,
      state: datafeed?.state,
      timing_stats: {
        bucket_count: datafeed?.timing_stats.bucket_count,
        exponential_average_search_time_per_hour_ms:
          datafeed?.timing_stats.exponential_average_search_time_per_hour_ms,
        search_count: datafeed?.timing_stats.search_count,
        total_search_time_ms: datafeed?.timing_stats.total_search_time_ms,
      },
    },
  };
};
