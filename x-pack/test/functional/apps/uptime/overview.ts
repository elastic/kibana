/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// tslint:disable-next-line:no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['uptime']);

  describe('Overview page', () => {
    describe('this is a simple test', () => {
      beforeEach(async () => {
        await esArchiver.load('uptime/fullexport');
      });
      afterEach(async () => await esArchiver.unload('uptime/fullexport'));
      it('overviewpagefails', async () => {
        await pageObjects.uptime.goToUptimeOverview();
      });
    });
  });
};
