/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

//import expect from 'expect.js';
//import { indexBy } from 'lodash';
export default function ({ getService, getPageObjects }) {
  //const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  //const testSubjects = getService('testSubjects');
  //const log = getService('log');
  const PageObjects = getPageObjects(['security', 'rollup', 'common', 'header']);


  describe('rollup_jobs', async () => {
    before(async () => {
      // init data
      await Promise.all([
        esArchiver.loadIfNeeded('logstash_functional'),
        esArchiver.load('canvas/default'),
      ]);

      // load canvas
      // see also navigateToUrl(app, hash)
      await PageObjects.common.navigateToApp('rollupjob');
    });

    it('create and and save a new job', async () => {
      // await PageObjects.watcher.createWatch(watchID, watchName);
      // const watch = await PageObjects.watcher.getWatch(watchID);
      // expect(watch.id).to.be(watchID);
      // expect(watch.name).to.be(watchName);
    });
  });
}
