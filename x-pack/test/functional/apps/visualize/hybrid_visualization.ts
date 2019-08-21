/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker']);
  const log = getService('log');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe.only('hybrid', () => {
    before(async () => {
      log.debug('loading hybrid test data');
      await esArchiver.load('hybrid/kibana');
      await esArchiver.load('hybrid/logstash');
      await esArchiver.load('hybrid/rollup');
    });

    after(async () => {
      //await esArchiver.unload('hybrid');
    });

    it('hybrid visualization', async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToApp('visualize');
      //await PageObjects.visualize.loadSavedVisualization(vizName1);

    });
  });
}
