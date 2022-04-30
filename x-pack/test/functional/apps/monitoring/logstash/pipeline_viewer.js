/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const overview = getService('monitoringClusterOverview');
  const pipelinesList = getService('monitoringLogstashPipelines');
  const pipelineViewer = getService('monitoringLogstashPipelineViewer');

  describe('Logstash pipeline viewer', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('x-pack/test/functional/es_archives/monitoring/logstash_pipelines', {
        from: 'Jan 22, 2018 @ 09:10:00.000',
        to: 'Jan 22, 2018 @ 09:41:00.000',
      });

      await overview.closeAlertsModal();

      // go to nginx_logs pipeline view
      await overview.clickLsPipelines();
      expect(await pipelinesList.isOnListing()).to.be(true);
      await pipelinesList.clickPipeline('nginx_logs');
      expect(await pipelineViewer.isOnPipelineViewer()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('displays pipelines inputs, filters and ouputs', async () => {
      const { inputs, filters, outputs } = await pipelineViewer.getPipelineDefinition();

      expect(inputs).to.eql([{ name: 'generator', metrics: ['mygen01', '62.5 e/s emitted'] }]);
      expect(filters).to.eql([
        { name: 'sleep', metrics: ['1%', '94.86 ms/e', '62.5 e/s received'] },
      ]);
      expect(outputs).to.eql([{ name: 'stdout', metrics: ['0%', '0 ms/e', '62.5 e/s received'] }]);
    });
  });
}
