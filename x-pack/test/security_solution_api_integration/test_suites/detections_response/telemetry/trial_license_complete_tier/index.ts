/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Detections Response -  Detection rule type telemetry', function () {
    loadTestFile(require.resolve('./usage_collector/all_types'));
    loadTestFile(require.resolve('./usage_collector/detection_rules'));
    loadTestFile(require.resolve('./usage_collector/detection_rule_status'));
    loadTestFile(require.resolve('./usage_collector/detection_rules_legacy_action'));

    loadTestFile(require.resolve('./task_based/all_types'));
    loadTestFile(require.resolve('./task_based/detection_rules'));
    loadTestFile(require.resolve('./task_based/security_lists'));
  });
};
