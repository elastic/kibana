/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'graph']);
  const log = getService('log');
  const screenshot = getService('screenshots');

  describe('creating a simple graph', () => {
    before(async () => {
      // return PageObjects.settings.createIndexPattern('packetbeat-*')
      // .then(() => {
      await PageObjects.common.navigateToApp('graph');
      // });
    });

    it('should show data circles', async () => {
      log.debug('### graph test 1-------------------------');
      await PageObjects.graph.selectIndexPattern('metricbeat-*');
      await PageObjects.graph.clickAddField();
      await PageObjects.graph.selectField('metricset.name');
      await PageObjects.common.sleep(2000);
      await PageObjects.graph.query('process');
      await PageObjects.common.sleep(4000);
      await screenshot.take('Graph');
      await PageObjects.common.sleep(2000);
      const circles = await PageObjects.graph.getGraphCircleText();
      log.debug('### circle values = ' + circles);
      expect(circles.length > 0).to.be(true);
    });
  });
}
