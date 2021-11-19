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
  const clusterOverview = getService('monitoringClusterOverview');
  const nodes = getService('monitoringLogstashNodes');
  const nodeDetail = getService('monitoringLogstashNodeDetail');
  const pipelinesList = getService('monitoringLogstashPipelines');

  describe('Logstash node detail', () => {
    describe('Node', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);
      const nodeSummaryStatus = {
        eventsIn: 'Events Received\n42.4k',
        eventsOut: 'Events Emitted\n39.4k',
        httpAddress: 'Transport Address\n127.0.0.1:9600',
        numReloads: 'Config Reloads\n0',
        pipelineBatchSize: 'Batch Size\n125',
        pipelineWorkers: 'Pipeline Workers\n8',
        uptime: 'Uptime\n8 minutes',
        version: 'Version\n7.0.0-alpha1',
      };

      before(async () => {
        await setup('x-pack/test/functional/es_archives/monitoring/logstash_pipelines', {
          from: 'Jan 22, 2018 @ 09:10:00.000',
          to: 'Jan 22, 2018 @ 09:41:00.000',
        });

        await clusterOverview.closeAlertsModal();

        // go to logstash nodes
        await clusterOverview.clickLsNodes();
        expect(await nodes.isOnNodesListing()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it('detail view should have summary status showing correct info', async () => {
        await nodes.clickRowByResolver('29a3dfa6-c146-4534-9bc0-be475d2ce950');
        expect(await nodeDetail.getSummary()).to.eql(nodeSummaryStatus);
      });
      it('advanced view should have summary status showing correct info', async () => {
        await nodeDetail.clickAdvanced();

        expect(await nodeDetail.getSummary()).to.eql(nodeSummaryStatus);
      });
      it('pipelines view should have summary status showing correct info', async () => {
        await nodeDetail.clickPipelines();

        expect(await nodeDetail.getSummary()).to.eql(nodeSummaryStatus);
      });
      it('pipelines view should have Pipelines table showing correct rows with default sorting', async () => {
        const rows = await pipelinesList.getRows();
        expect(rows.length).to.be(3);

        await pipelinesList.clickIdCol();

        const pipelinesAll = await pipelinesList.getPipelinesAll();

        const tableData = [
          { id: 'nginx_logs', eventsEmittedRate: '62.5 e/s', nodeCount: '1' },
          { id: 'test_interpolation', eventsEmittedRate: '0 e/s', nodeCount: '1' },
          { id: 'tweets_about_labradoodles', eventsEmittedRate: '1.2 e/s', nodeCount: '1' },
        ];

        // check the all data in the table
        pipelinesAll.forEach((obj, index) => {
          expect(pipelinesAll[index].id).to.be(tableData[index].id);
          expect(pipelinesAll[index].eventsEmittedRate).to.be(tableData[index].eventsEmittedRate);
          expect(pipelinesAll[index].nodeCount).to.be(tableData[index].nodeCount);
        });
      });

      it('should have Pipelines Table showing correct rows after sorting by Events Emitted Rate Asc', async () => {
        await pipelinesList.clickEventsEmittedRateCol();

        const rows = await pipelinesList.getRows();
        expect(rows.length).to.be(3);

        const pipelinesAll = await pipelinesList.getPipelinesAll();

        const tableData = [
          { id: 'test_interpolation', eventsEmittedRate: '0 e/s', nodeCount: '1' },
          { id: 'tweets_about_labradoodles', eventsEmittedRate: '1.2 e/s', nodeCount: '1' },
          { id: 'nginx_logs', eventsEmittedRate: '62.5 e/s', nodeCount: '1' },
        ];

        // check the all data in the table
        pipelinesAll.forEach((obj, index) => {
          expect(pipelinesAll[index].id).to.be(tableData[index].id);
          expect(pipelinesAll[index].eventsEmittedRate).to.be(tableData[index].eventsEmittedRate);
          expect(pipelinesAll[index].nodeCount).to.be(tableData[index].nodeCount);
        });
      });

      it('should filter for non-existent pipeline', async () => {
        await pipelinesList.setFilter('foobar');
        await pipelinesList.assertNoData();
        await pipelinesList.clearFilter();
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
    });
  });
}
