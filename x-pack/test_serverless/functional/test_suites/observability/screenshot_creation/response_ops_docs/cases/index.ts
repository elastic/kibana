/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const browser = getService('browser');

  describe('observability cases', function () {
    before(async () => {
      await browser.setWindowSize(1920, 1080);
    });

    loadTestFile(require.resolve('./list_view'));
    loadTestFile(require.resolve('./settings'));
  });
}
