/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

// refer to the below docs for CCR, Remote Clusters
// https://www.elastic.co/guide/en/elasticsearch/reference/current/ccr-getting-started.html#ccr-getting-started-prerequisites
// https://www.elastic.co/guide/en/kibana/7.9/working-remote-clusters.html
export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Remote Clusters app', function () {
    this.tags(['ciGroup4', 'skipCloud']);
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./home_page'));
  });
};
