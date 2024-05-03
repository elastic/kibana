/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Entity Analytics - Risk Engine', function () {
    loadTestFile(require.resolve('./init_and_status_apis'));
    loadTestFile(require.resolve('./risk_score_calculation'));
    loadTestFile(require.resolve('./risk_score_preview'));
    loadTestFile(require.resolve('./risk_scoring_task/task_execution'));
    loadTestFile(require.resolve('./risk_scoring_task/task_execution_nondefault_spaces'));
    loadTestFile(require.resolve('./telemetry_usage'));
    loadTestFile(require.resolve('./risk_engine_privileges'));
    loadTestFile(require.resolve('./asset_criticality'));
    loadTestFile(require.resolve('./asset_criticality_privileges'));
    loadTestFile(require.resolve('./asset_criticality_csv_upload'));
  });
}
