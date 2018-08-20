/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const usageAPI = getService('usageAPI');

  describe('/api/_xpack/usage', () => {
    before('load archives', async () => {
      await esArchiver.load('../../../../test/functional/fixtures/es_archiver/dashboard/current/kibana');
    });

    after(async () => {
      await esArchiver.unload('../../../../test/functional/fixtures/es_archiver/dashboard/current/kibana');
    });

    it('should reject without authentication headers passed', async () => {
      const rejected = await usageAPI.getUsageStatsNoAuth();
      expect(rejected).to.eql({ statusCode: 401, error: 'Unauthorized' });
    });

    it('should return xpack usage data', async () => {
      const usage = await usageAPI.getUsageStats();

      expect(usage.cluster_uuid).to.be.a('string');
      expect(usage.kibana.dashboard.total).to.be(26);
      expect(usage.kibana.visualization.total).to.be(47);
      expect(usage.kibana.search.total).to.be(5);
      expect(usage.kibana.index_pattern.total).to.be(3);
      expect(usage.kibana.timelion_sheet.total).to.be(0);
      expect(usage.kibana.graph_workspace.total).to.be(0);
    });
  });
}
