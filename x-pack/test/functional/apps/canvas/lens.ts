/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function canvasLensTest({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['canvas', 'common', 'header', 'lens']);
  const esArchiver = getService('esArchiver');

  describe('lens in canvas', function () {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/canvas/lens');
      // open canvas home
      await PageObjects.common.navigateToApp('canvas');
      // load test workpad
      await PageObjects.common.navigateToApp('canvas', {
        hash: '/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31/page/1',
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/canvas/lens');
    });

    it('renders lens visualization', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.lens.assertMetric('Maximum of bytes', '16,788');
    });
  });
}
