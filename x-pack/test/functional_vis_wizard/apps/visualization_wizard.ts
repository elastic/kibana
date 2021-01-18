/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['visualize']);

  describe('lens and maps disabled', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('visualize/default');
    });

    after(async function () {
      await esArchiver.unload('logstash_functional');
      await esArchiver.unload('visualize/default');
    });

    it('should not display lens and maps cards', async function () {
      await PageObjects.visualize.navigateToNewVisualization();
      const expectedChartTypes = ['Custom visualization', 'TSVB'];

      // find all the chart types and make sure that maps and lens cards are not there
      const chartTypes = (await PageObjects.visualize.getPromotedVisTypes()).sort();
      expect(chartTypes).to.eql(expectedChartTypes);
    });
  });
}
