/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const actions = getService('actions');
  const browser = getService('browser');
  const svlCommonApi = getService('svlCommonApi');

  describe('observability connectors', function () {
    before(async () => {
      await browser.setWindowSize(1920, 1080);
    });

    after(async () => {
      await actions.api.deleteAllConnectors(svlCommonApi.getInternalRequestHeader());
    });

    loadTestFile(require.resolve('./server_log_connector'));
  });
}
