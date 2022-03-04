/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Detection rule type telemetry', function () {
    describe('', function () {
      this.tags('ciGroup11');
      loadTestFile(require.resolve('./usage_collector/all_types'));
      loadTestFile(require.resolve('./usage_collector/detection_rules'));

      loadTestFile(require.resolve('./task_based/all_types'));
      loadTestFile(require.resolve('./task_based/detection_rules'));
      loadTestFile(require.resolve('./task_based/security_lists'));
    });
  });
};
