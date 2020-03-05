/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const testDataList = [
  {
    suiteSuffix: 'with farequote dataset and 30m bucket span',
    jobSource: 'farequote',
    jobId: `fq_single_1_${Date.now()}`,
    get jobIdClone(): string {
      return `${this.jobId}_clone`;
    },
    jobDescription:
      'Create single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)',
    jobGroups: ['automated', 'farequote', 'single-metric'],
    get jobGroupsClone(): string[] {
      return [...this.jobGroups, 'clone'];
    },
    aggAndFieldIdentifier: 'Mean(responsetime)',
    bucketSpan: '30m',
    memoryLimit: '15mb',
    expected: {
      wizard: {
        fullTimeRangStart: 'Feb 7, 2016 @ 00:00:00.000',
        fullTimeRangeEnd: 'Feb 11, 2016 @ 23:59:54.000',
      },
      row: {
        recordCount: '2,399',
        memoryStatus: 'ok',
        jobState: 'closed',
        datafeedState: 'stopped',
        latestTimestamp: '2016-02-11 23:56:59',
      },
      counts: {
        processed_record_count: '2,399',
        processed_field_count: '4,798',
        input_bytes: '180.6 KB',
        input_field_count: '4,798',
        invalid_date_count: '0',
        missing_field_count: '0',
        out_of_order_timestamp_count: '0',
        empty_bucket_count: '0',
        sparse_bucket_count: '0',
        bucket_count: '239',
        earliest_record_timestamp: '2016-02-07 00:02:50',
        latest_record_timestamp: '2016-02-11 23:56:59',
        input_record_count: '2,399',
        latest_bucket_timestamp: '2016-02-11 23:30:00',
      },
      modelSizeStats: {
        result_type: 'model_size_stats',
        model_bytes_exceeded: '0.0 B',
        model_bytes_memory_limit: '15.0 MB',
        total_by_field_count: '3',
        total_over_field_count: '0',
        total_partition_field_count: '2',
        bucket_allocation_failures_count: '0',
        memory_status: 'ok',
        timestamp: '2016-02-11 23:00:00',
      },
    },
  },
];

export { testDataList };
