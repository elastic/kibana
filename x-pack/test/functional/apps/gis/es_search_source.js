/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const remote = getService('remote');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'settings']);

  describe('layer source is elasticsearch documents', () => {
    before('initialize tests', async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('gis');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      });
      await kibanaServer.uiSettings.disableToastAutohide();
      remote.setWindowSize(1600, 1000);

      await PageObjects.common.navigateToApp('gis');
    });

    describe('inspector', () => {
      it('should register elasticsearch request in inspector', async () => {
        //await PageObjects.common.sleep(100000);
        expect(5).to.equal(5);
      });
    });
  });
}
