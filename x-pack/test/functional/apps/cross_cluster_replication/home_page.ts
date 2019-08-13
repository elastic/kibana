/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const pageObjects = getPageObjects(['common', 'crossClusterReplication']);
  const log = getService('log');

  describe('Home page', function() {
    this.tags('smoke');
    before(async () => {
      await pageObjects.common.navigateToApp('crossClusterReplication');
    });

    it('Loads the app', async () => {
      await log.debug(`Checking for app title to be Cross-Cluster Replication`);
      const appTitleText = await pageObjects.crossClusterReplication.appTitleText();
      expect(appTitleText).to.be('Cross-Cluster Replication');

      const followerIndexButton = await pageObjects.crossClusterReplication.createFollowerIndexButton();
      expect(await followerIndexButton.isDisplayed()).to.be(true);
    });
  });
};
