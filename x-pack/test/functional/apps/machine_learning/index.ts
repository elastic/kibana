/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService, loadTestFile }: FtrProviderContext) {
  const ml = getService('ml');

  // ML tests need to be disabled in orde to get the ES snapshot with
  // https://github.com/elastic/elasticsearch/pull/54713 promoted
  // and should be re-enabled as part of https://github.com/elastic/kibana/pull/61980
  describe.skip('machine learning', function() {
    this.tags('ciGroup3');

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();
    });

    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./pages'));
    loadTestFile(require.resolve('./anomaly_detection'));
    loadTestFile(require.resolve('./data_visualizer'));
    loadTestFile(require.resolve('./data_frame_analytics'));
  });
}
