/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import deepmerge from 'deepmerge';
import type { FtrProviderContext } from '../../ftr_provider_context';
import {
  assertTelemetryPayload,
  flatKeys,
} from '../../../../../test/api_integration/apis/telemetry/utils';
import ossRootTelemetrySchema from '../../../../../src/plugins/telemetry/schema/oss_root.json';
import ossPluginsTelemetrySchema from '../../../../../src/plugins/telemetry/schema/oss_plugins.json';
import xpackRootTelemetrySchema from '../../../../plugins/telemetry_collection_xpack/schema/xpack_root.json';
import xpackPluginsTelemetrySchema from '../../../../plugins/telemetry_collection_xpack/schema/xpack_plugins.json';

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

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('/api/telemetry/v2/clusters/_stats with monitoring disabled', () => {
    let stats: Record<string, any>;

    before('disable monitoring and pull local stats', async () => {
      await es.cluster.putSettings({ body: disableCollection });
      await new Promise((r) => setTimeout(r, 1000));

      const { body } = await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ unencrypted: true, refreshCache: true })
        .expect(200);

      expect(body.length).to.be(1);
      stats = body[0].stats;
    });

    it('should pass the schema validation', () => {
      const root = deepmerge(ossRootTelemetrySchema, xpackRootTelemetrySchema);
      const plugins = deepmerge(ossPluginsTelemetrySchema, xpackPluginsTelemetrySchema);

      try {
        assertTelemetryPayload({ root, plugins }, stats);
      } catch (err) {
        err.message = `The telemetry schemas in 'x-pack/plugins/telemetry_collection_xpack/schema/' are out-of-date, please update it as required: ${err.message}`;
        throw err;
      }
    });

    it('should pass ad-hoc enforced validations', () => {
      expect(stats.collection).to.be('local');
      expect(stats.collectionSource).to.be('local_xpack');

      // License should exist in X-Pack
      expect(stats.license.issuer).to.be.a('string');
      expect(stats.license.status).to.be('active');

      expect(stats.stack_stats.kibana.count).to.be(1);
      expect(stats.stack_stats.kibana.indices).to.be(1);

      expect(stats.stack_stats.kibana.dashboard.total).to.be.a('number');
      expect(stats.stack_stats.kibana.graph_workspace.total).to.be.a('number');
      expect(stats.stack_stats.kibana.index_pattern.total).to.be.a('number');
      expect(stats.stack_stats.kibana.search.total).to.be.a('number');
      expect(stats.stack_stats.kibana.visualization.total).to.be.a('number');

      expect(stats.stack_stats.kibana.plugins.apm.services_per_agent).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.infraops.last_24_hours).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.kql.defaultQueryLanguage).to.be.a('string');
      expect(stats.stack_stats.kibana.plugins.maps.timeCaptured).to.be.a('string');
      expect(stats.stack_stats.kibana.plugins.maps.attributes).to.be(undefined);
      expect(stats.stack_stats.kibana.plugins.maps.id).to.be(undefined);
      expect(stats.stack_stats.kibana.plugins.maps.type).to.be(undefined);

      expect(stats.stack_stats.kibana.plugins.reporting.enabled).to.be(true);
      expect(stats.stack_stats.kibana.plugins.rollups.index_patterns).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.spaces.available).to.be(true);
      expect(stats.stack_stats.kibana.plugins.fileUpload.file_upload.index_creation_count).to.be.a(
        'number'
      );

      expect(stats.stack_stats.kibana.os.platforms[0].platform).to.be.a('string');
      expect(stats.stack_stats.kibana.os.platforms[0].count).to.be(1);
      expect(stats.stack_stats.kibana.os.platformReleases[0].platformRelease).to.be.a('string');
      expect(stats.stack_stats.kibana.os.platformReleases[0].count).to.be(1);

      expect(stats.stack_stats.xpack.graph).to.be.an('object');
      expect(stats.stack_stats.xpack.transform).to.be.an('object');
      expect(stats.stack_stats.xpack.transform.available).to.be.an('boolean');
      expect(stats.stack_stats.xpack.transform.enabled).to.be.an('boolean');
      expect(stats.stack_stats.xpack.ilm).to.be.an('object');
      expect(stats.stack_stats.xpack.logstash).to.be.an('object');
      expect(stats.stack_stats.xpack.ml).to.be.an('object');
      expect(stats.stack_stats.xpack.monitoring).to.be.an('object');
      expect(stats.stack_stats.xpack.rollup).to.be.an('object');
    });

    it('should validate mandatory fields exist', () => {
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
        'stack_stats.kibana.versions',
        'stack_stats.kibana.visualization',
        'stack_stats.xpack.ccr',
        'stack_stats.xpack.transform',
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

      expect(expected.every((m) => actual.includes(m))).to.be.ok();
    });
  });
}
