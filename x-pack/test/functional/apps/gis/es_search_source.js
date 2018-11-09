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
    'settings',
    'gis']);

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

      await PageObjects.gis.loadSavedWorkspace('logstash events');
    });

    after('clean up', async () => {
      await PageObjects.gis.closeInspector();
    });

    describe('inspector', () => {
      it('should register elasticsearch request in inspector', async () => {
        const hits = await PageObjects.gis.getInspectorRequestStat('Hits');
        expect(hits).to.equal('0');
      });
    });
  });
}
