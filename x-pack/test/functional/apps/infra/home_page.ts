/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

const DATE_WITH_DATA = new Date(1539806283000);
const DATE_WITHOUT_DATA = new Date(1539122400000);

// tslint:disable-next-line:no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['common', 'infraHome']);

  describe('Home page', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    describe('without metrics present', () => {
      before(async () => await esArchiver.unload('infra/metrics_and_logs'));

      it('renders an empty data prompt', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.getNoMetricsIndicesPrompt();
      });
    });

    describe('with metrics present', () => {
      before(async () => {
        await esArchiver.load('infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
      });
      after(async () => await esArchiver.unload('infra/metrics_and_logs'));

      it('renders the waffle map for dates with data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
      });

      it('renders an empty data prompt for dates with no data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITHOUT_DATA);
        await pageObjects.infraHome.getNoMetricsDataPrompt();
      });
    });
  });
};
