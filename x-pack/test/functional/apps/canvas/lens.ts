/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function canvasLensTest({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['canvas', 'common', 'header', 'lens']);
  const esArchiver = getService('esArchiver');

  describe('lens in canvas', function () {
    before(async () => {
      await esArchiver.load('canvas/lens');
      // open canvas home
      await PageObjects.common.navigateToApp('canvas');
      // load test workpad
      await PageObjects.common.navigateToApp('canvas', {
        hash: '/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31/page/1',
      });
    });

    it('renders lens visualization', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.lens.assertMetric('Maximum of bytes', '16,788');
    });
  });
}
