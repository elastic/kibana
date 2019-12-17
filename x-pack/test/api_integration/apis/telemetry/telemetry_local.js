/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import _ from 'lodash';

/*
 * Create a single-level array with strings for all the paths to values in the
 * source object, up to 3 deep. Going deeper than 3 causes a bit too much churn
 * in the tests.
 */
function flatKeys(source) {
  const recursivelyFlatKeys = (obj, path = [], depth = 0) => {
    return depth < 3 && _.isObject(obj)
      ? _.map(obj, (v, k) => recursivelyFlatKeys(v, [...path, k], depth + 1))
      : path.join('.');
  };

  return _.uniq(_.flattenDeep(recursivelyFlatKeys(source))).sort((a, b) => a.localeCompare(b));
}

const disableCollection = {
  persistent: {
    xpack: {
      monitoring: {
        collection: {
          enabled: false,
        },
      },
    },
  },
};

export default function({ getService }) {
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');

  describe('/api/telemetry/v2/clusters/_stats with monitoring disabled', () => {
    before('', async () => {
      await esSupertest
        .put('/_cluster/settings')
        .send(disableCollection)
        .expect(200);
      await new Promise(r => setTimeout(r, 1000));
    });

    it('should pull local stats and validate data types', async () => {
      const timeRange = {
        min: '2018-07-23T22:07:00Z',
        max: '2018-07-23T22:13:00Z',
      };

      const { body } = await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, unencrypted: true })
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
      expect(stats.stack_stats.xpack.maps).to.be.an('object');
      expect(stats.stack_stats.xpack.transform).to.be.an('object');
      expect(stats.stack_stats.xpack.transform.available).to.be.an('boolean');
      expect(stats.stack_stats.xpack.transform.enabled).to.be.an('boolean');
      expect(stats.stack_stats.xpack.ilm).to.be.an('object');
      expect(stats.stack_stats.xpack.logstash).to.be.an('object');
      expect(stats.stack_stats.xpack.ml).to.be.an('object');
      expect(stats.stack_stats.xpack.monitoring).to.be.an('object');
      expect(stats.stack_stats.xpack.rollup).to.be.an('object');
    });

    it('should pull local stats and validate fields', async () => {
      const timeRange = {
        min: '2018-07-23T22:07:00Z',
        max: '2018-07-23T22:13:00Z',
      };

      const { body } = await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, unencrypted: true })
        .expect(200);

      const stats = body[0];
      const actual = flatKeys(stats);

      const expected = [
        'cluster_name',
        'cluster_stats.cluster_uuid',
        'cluster_stats.indices.completion',
        'cluster_stats.indices.count',
        'cluster_stats.indices.docs',
        'cluster_stats.indices.fielddata',
        'cluster_stats.indices.query_cache',
        'cluster_stats.indices.segments',
        'cluster_stats.indices.shards',
        'cluster_stats.indices.store',
        'cluster_stats.nodes.count',
        'cluster_stats.nodes.discovery_types',
        'cluster_stats.nodes.fs',
        'cluster_stats.nodes.jvm',
        'cluster_stats.nodes.network_types',
        'cluster_stats.nodes.os',
        'cluster_stats.nodes.plugins',
        'cluster_stats.nodes.process',
        'cluster_stats.nodes.versions',
        'cluster_stats.status',
        'cluster_stats.timestamp',
        'cluster_uuid',
        'collection',
        'license.expiry_date',
        'license.expiry_date_in_millis',
        'license.issue_date',
        'license.issue_date_in_millis',
        'license.issued_to',
        'license.issuer',
        'license.max_nodes',
        'license.start_date_in_millis',
        'license.status',
        'license.type',
        'license.uid',
        'stack_stats.kibana.count',
        'stack_stats.kibana.dashboard',
        'stack_stats.kibana.graph_workspace',
        'stack_stats.kibana.index_pattern',
        'stack_stats.kibana.indices',
        'stack_stats.kibana.os',
        'stack_stats.kibana.plugins',
        'stack_stats.kibana.search',
        'stack_stats.kibana.timelion_sheet',
        'stack_stats.kibana.versions',
        'stack_stats.kibana.visualization',
        'stack_stats.xpack.ccr',
        'stack_stats.xpack.transform',
        'stack_stats.xpack.maps',
        'stack_stats.xpack.graph',
        'stack_stats.xpack.ilm',
        'stack_stats.xpack.logstash',
        'stack_stats.xpack.ml',
        'stack_stats.xpack.monitoring',
        'stack_stats.xpack.rollup',
        'stack_stats.xpack.security',
        'stack_stats.xpack.sql',
        'stack_stats.xpack.watcher',
        'timestamp',
        'version',
      ];

      expect(expected.every(m => actual.includes(m))).to.be.ok();
    });
  });
}
