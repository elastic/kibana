/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const clusterList = getService('monitoringClusterList');

  describe('Cluster listing mb', () => {
    describe('with standalone cluster', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('x-pack/test/functional/es_archives/monitoring/standalone_cluster_mb', {
          from: 'Feb 4, 2019 @ 17:50:00.000',
          to: 'Feb 4, 2019 @ 17:52:00.000',
          useCreate: true,
        });

        await clusterList.closeAlertsModal();
        await clusterList.assertDefaults();
      });

      after(async () => {
        await tearDown();
      });

      it('displays a standalone cluster', async () => {
        expect(await clusterList.hasCluster('__standalone_cluster__')).to.be(true);
        expect(await clusterList.hasCluster('lfhHkgqfTy2Vy3SvlPSvXg')).to.be(true);
      });
    });
  });
}
