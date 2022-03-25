/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const overview = getService('monitoringClusterOverview');
  const pipelinesList = getService('monitoringLogstashPipelines');
  const lsClusterSummaryStatus = getService('monitoringLogstashSummaryStatus');

  describe('Logstash pipelines mb', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('x-pack/test/functional/es_archives/monitoring/logstash_pipelines_mb', {
        from: 'Jan 22, 2018 @ 09:10:00.000',
        to: 'Jan 22, 2018 @ 09:41:00.000',
        useCreate: true,
      });

      await overview.closeAlertsModal();

      // go to pipelines listing
      await overview.clickLsPipelines();
      expect(await pipelinesList.isOnListing()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('should have Logstash Cluster Summary Status showing correct info', async () => {
      expect(await lsClusterSummaryStatus.getContent()).to.eql({
        nodeCount: 'Nodes\n2',
        memoryUsed: 'Memory\n528.4 MB / 1.9 GB',
        eventsInTotal: 'Events Received\n117.9k',
        eventsOutTotal: 'Events Emitted\n111.9k',
      });
    });

    it('should have Pipelines table showing correct rows with default sorting', async () => {
      const rows = await pipelinesList.getRows();
      expect(rows.length).to.be(4);

      await pipelinesList.clickIdCol();

      // retry in case the table hasn't had time to re-render
      await retry.try(async () => {
        const pipelinesAll = await pipelinesList.getPipelinesAll();

        expect(pipelinesAll).to.eql([
          { id: 'main', eventsEmittedRate: '162.5 e/s', nodeCount: '1' },
          { id: 'nginx_logs', eventsEmittedRate: '62.5 e/s', nodeCount: '1' },
          { id: 'test_interpolation', eventsEmittedRate: '0 e/s', nodeCount: '1' },
          { id: 'tweets_about_labradoodles', eventsEmittedRate: '1.2 e/s', nodeCount: '1' },
        ]);
      });
    });

    it('should have Pipelines Table showing correct rows after sorting by Events Emitted Rate Asc', async () => {
      await pipelinesList.clickEventsEmittedRateCol();

      // retry in case the table hasn't had time to re-render
      await retry.try(async () => {
        const rows = await pipelinesList.getRows();
        expect(rows.length).to.be(4);

        const pipelinesAll = await pipelinesList.getPipelinesAll();

        expect(pipelinesAll).to.eql([
          { id: 'test_interpolation', eventsEmittedRate: '0 e/s', nodeCount: '1' },
          { id: 'tweets_about_labradoodles', eventsEmittedRate: '1.2 e/s', nodeCount: '1' },
          { id: 'nginx_logs', eventsEmittedRate: '62.5 e/s', nodeCount: '1' },
          { id: 'main', eventsEmittedRate: '162.5 e/s', nodeCount: '1' },
        ]);
      });
    });

    it('should filter for specific pipelines', async () => {
      await pipelinesList.setFilter('la');
      await PageObjects.common.pressEnterKey();
      await retry.try(async () => {
        const rows = await pipelinesList.getRows();
        expect(rows.length).to.be(2);
      });
      await pipelinesList.clearFilter();
    });

    it('should filter for non-existent pipeline', async () => {
      await pipelinesList.setFilter('foobar');
      await pipelinesList.assertNoData();
      await pipelinesList.clearFilter();
    });
  });
}
