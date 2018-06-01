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
      const { body, statusCode } = await usageAPI.getUsageStatsNoAuth();
      expect(body).to.eql({ statusCode: 401, error: 'Unauthorized' });
      expect(statusCode).to.be(401);
    });

    it('should return xpack usage data', async () => {
      const { body, statusCode } = await usageAPI.getUsageStats();

      expect(body.cluster_uuid).to.be.a('string');
      expect(body.kibana.dashboard.total).to.be(26);
      expect(body.kibana.visualization.total).to.be(47);
      expect(body.kibana.search.total).to.be(5);
      expect(body.kibana.index_pattern.total).to.be(3);
      expect(body.kibana.timelion_sheet.total).to.be(0);
      expect(body.kibana.graph_workspace.total).to.be(0);
      expect(statusCode).to.be(200);
    });
  });
}
