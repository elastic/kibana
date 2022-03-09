/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const clusterOverview = getService('monitoringClusterOverview');
  const overview = getService('monitoringEnterpriseSearchOverview');
  const entSearchSummaryStatus = getService('monitoringEnterpriseSearchSummaryStatus');

  describe('ent-search overview', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('x-pack/test/functional/es_archives/monitoring/ent_search/with_es', {
        from: 'Oct 15, 2021 @ 14:00:00.000',
        to: 'Oct 15, 2021 @ 22:00:00.000',
      });

      await clusterOverview.closeAlertsModal();

      // go to Enterprise Search overview
      await clusterOverview.clickEntSearchOverview();
      expect(await overview.isOnOverview()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('cluster status bar shows correct information', async () => {
      expect(await entSearchSummaryStatus.getContent()).to.eql({
        instances: 'Instances\n1',
        appSearchEngines: 'App Search Engines\n2',
        workplaceSearchOrgSources: 'Org Content Sources\n1',
      });
    });
  });
}
