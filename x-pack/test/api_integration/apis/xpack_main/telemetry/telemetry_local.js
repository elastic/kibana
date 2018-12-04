/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

const disableCollection = {
  "persistent":
  {
    xpack: {
      monitoring: {
        collection: {
          enabled: false
        }
      }
    }
  }
};

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');

  describe('/api/telemetry/v1/clusters/_stats with monitoring disabled', () => {
    before('', async () => {
      await esSupertest.put('/_cluster/settings').send(disableCollection).expect(200);
    });

    it('should pull local stats', async () => {
      const timeRange = {
        min: '2018-07-23T22:07:00Z',
        max: '2018-07-23T22:13:00Z'
      };

      const { body } = await supertest
        .post('/api/telemetry/v1/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body.length).to.be(1);
      const stats = body[0];

      expect(stats.collection).to.be('local');
      expect(stats.license.issuer).to.be('elasticsearch');
      expect(stats.license.status).to.be('active');

      expect(stats.stack_stats.kibana.count).to.be(1);
      expect(stats.stack_stats.kibana.indices).to.be(1);

      expect(stats.stack_stats.kibana.dashboard.total).to.be.a('number');
      expect(stats.stack_stats.kibana.graph_workspace.total).to.be.a('number');
      expect(stats.stack_stats.kibana.index_pattern.total).to.be.a('number');
      expect(stats.stack_stats.kibana.search.total).to.be.a('number');
      expect(stats.stack_stats.kibana.timelion_sheet.total).to.be.a('number');
      expect(stats.stack_stats.kibana.visualization.total).to.be.a('number');

      expect(stats.stack_stats.kibana.plugins.apm.services_per_agent).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.infraops.last_24_hours).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.kql.defaultQueryLanguage).to.be.a('string');
      expect(stats.stack_stats.kibana.plugins.reporting.enabled).to.be(true);
      expect(stats.stack_stats.kibana.plugins.rollups.index_patterns).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.spaces.available).to.be(true);

      expect(stats.stack_stats.kibana.os.platforms[0].platform).to.be.a('string');
      expect(stats.stack_stats.kibana.os.platforms[0].count).to.be(1);
      expect(stats.stack_stats.kibana.os.platformReleases[0].platformRelease).to.be.a('string');
      expect(stats.stack_stats.kibana.os.platformReleases[0].count).to.be(1);

      expect(stats.stack_stats.xpack.graph).to.be.an('object');
      expect(stats.stack_stats.xpack.ilm).to.be.an('object');
      expect(stats.stack_stats.xpack.logstash).to.be.an('object');
      expect(stats.stack_stats.xpack.ml).to.be.an('object');
      expect(stats.stack_stats.xpack.monitoring).to.be.an('object');
      expect(stats.stack_stats.xpack.rollup).to.be.an('object');
    });
  });
}

