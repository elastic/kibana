/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATES } from '../../../functional/apps/infra/constants';
const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'infraHome']);
  const visualTesting = getService('visualTesting');
  const esArchiver = getService('esArchiver');

  describe('waffle map', () => {
    before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
    after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));

    it('should just work', async () => {
      await PageObjects.common.navigateToApp('infraOps');
      await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
      await PageObjects.infraHome.getWaffleMap();
      await visualTesting.snapshot();
    });
  });
}
