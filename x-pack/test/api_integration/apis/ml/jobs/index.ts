/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('jobs', function () {
    loadTestFile(require.resolve('./categorization_field_examples'));
    loadTestFile(require.resolve('./jobs_summary'));
    loadTestFile(require.resolve('./delete_jobs'));
    loadTestFile(require.resolve('./close_jobs'));
    loadTestFile(require.resolve('./jobs_summary_spaces'));
    loadTestFile(require.resolve('./jobs_exist_spaces'));
    loadTestFile(require.resolve('./close_jobs_spaces'));
    loadTestFile(require.resolve('./delete_jobs_spaces'));
    loadTestFile(require.resolve('./datafeed_preview'));
    loadTestFile(require.resolve('./force_start_datafeeds'));
    loadTestFile(require.resolve('./force_start_datafeeds_spaces'));
    loadTestFile(require.resolve('./stop_datafeeds'));
    loadTestFile(require.resolve('./stop_datafeeds_spaces'));
    loadTestFile(require.resolve('./get_groups'));
    loadTestFile(require.resolve('./jobs'));
    loadTestFile(require.resolve('./reset'));
    loadTestFile(require.resolve('./update_groups'));
    loadTestFile(require.resolve('./category_results'));
    loadTestFile(require.resolve('./jobs_with_time_range'));
    loadTestFile(require.resolve('./bulk_create_jobs'));
    loadTestFile(require.resolve('./all_jobs_and_group_ids'));
  });
}
