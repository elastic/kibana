/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const overview = getService('monitoringClusterOverview');

  describe('beats cluster', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('monitoring/beats', {
        from: '2017-12-19 17:14:09.000',
        to: '2017-12-19 18:15:09.000',
      });
    });

    after(async () => {
      await tearDown();
    });

    it('shows beats panel with data', async () => {
      expect(await overview.getBeatsTotalEventsRate()).to.be('699.9k');
      expect(await overview.getBeatsTotalBytesSentRate()).to.be('427.9 MB');
      expect(await overview.getBeatsListingDetail()).to.eql({
        total: 404,
        types: {
          filebeat: 200,
          heartbeat: 100,
          metricbeat: 100,
          cowbeat: 1,
          duckbeat: 1,
          sheepbeat: 1,
          winlogbeat: 1,
        }
      });
    });

  });
}
