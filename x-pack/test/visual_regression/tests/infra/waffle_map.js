/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { DATES } from '../../../api_integration/apis/infra/constants';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['infraHome']);
  const visualTesting = getService('visualTesting');
  const esArchiver = getService('esArchiver');

  describe('waffle map', () => {
    before(() => esArchiver.load('infra/8.0.0/logs_and_metrics'));
    after(() => esArchiver.unload('infra/8.0.0/logs_and_metrics'));

    it('should just work', async () => {
      await PageObjects.infraHome.getWaffleMap();
      await PageObjects.infraHome.goToTime(
        moment(DATES['8.0.0'].logs_and_metrics.max).toISOString()
      );
      await visualTesting.snapshot();
    });
  });
}
