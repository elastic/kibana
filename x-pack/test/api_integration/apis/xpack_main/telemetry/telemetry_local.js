/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

/*
 * Create a single-level array with strings for all the paths to values in the
 * source object
 */
const flatKeys = (source, path = [], results = []) => {
  Object.keys(source).forEach(key => {
    if (typeof source[key] === 'object' && source[key] != null) {
      results = flatKeys(source[key], [...path, key], results);
    } else {
      results = [].concat(results, [...path, key].join('.'));
    }
  });
  return results;
};

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

    it('should pull local stats and validate fields', async () => {
      const timeRange = {
        min: '2018-07-23T22:07:00Z',
        max: '2018-07-23T22:13:00Z'
      };

      const { body } = await supertest
        .post('/api/telemetry/v1/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      const stats = body[0];
      const actual = flatKeys(stats).sort();
      const expected = [
        'cluster_name',
        'cluster_stats.cluster_uuid',
        'cluster_stats.indices.completion.size_in_bytes',
        'cluster_stats.indices.count',
        'cluster_stats.indices.docs.count',
        'cluster_stats.indices.docs.deleted',
        'cluster_stats.indices.fielddata.evictions',
        'cluster_stats.indices.fielddata.memory_size_in_bytes',
        'cluster_stats.indices.query_cache.cache_count',
        'cluster_stats.indices.query_cache.cache_size',
        'cluster_stats.indices.query_cache.evictions',
        'cluster_stats.indices.query_cache.hit_count',
        'cluster_stats.indices.query_cache.memory_size_in_bytes',
        'cluster_stats.indices.query_cache.miss_count',
        'cluster_stats.indices.query_cache.total_count',
        'cluster_stats.indices.segments.count',
        'cluster_stats.indices.segments.doc_values_memory_in_bytes',
        'cluster_stats.indices.segments.fixed_bit_set_memory_in_bytes',
        'cluster_stats.indices.segments.index_writer_memory_in_bytes',
        'cluster_stats.indices.segments.max_unsafe_auto_id_timestamp',
        'cluster_stats.indices.segments.memory_in_bytes',
        'cluster_stats.indices.segments.norms_memory_in_bytes',
        'cluster_stats.indices.segments.points_memory_in_bytes',
        'cluster_stats.indices.segments.stored_fields_memory_in_bytes',
        'cluster_stats.indices.segments.term_vectors_memory_in_bytes',
        'cluster_stats.indices.segments.terms_memory_in_bytes',
        'cluster_stats.indices.segments.version_map_memory_in_bytes',
        'cluster_stats.indices.shards.index.primaries.avg',
        'cluster_stats.indices.shards.index.primaries.max',
        'cluster_stats.indices.shards.index.primaries.min',
        'cluster_stats.indices.shards.index.replication.avg',
        'cluster_stats.indices.shards.index.replication.max',
        'cluster_stats.indices.shards.index.replication.min',
        'cluster_stats.indices.shards.index.shards.avg',
        'cluster_stats.indices.shards.index.shards.max',
        'cluster_stats.indices.shards.index.shards.min',
        'cluster_stats.indices.shards.primaries',
        'cluster_stats.indices.shards.replication',
        'cluster_stats.indices.shards.total',
        'cluster_stats.indices.store.size_in_bytes',
        'cluster_stats.nodes.count.coordinating_only',
        'cluster_stats.nodes.count.data',
        'cluster_stats.nodes.count.ingest',
        'cluster_stats.nodes.count.master',
        'cluster_stats.nodes.count.total',
        'cluster_stats.nodes.discovery_types.single-node',
        'cluster_stats.nodes.fs.available_in_bytes',
        'cluster_stats.nodes.fs.free_in_bytes',
        'cluster_stats.nodes.fs.total_in_bytes',
        'cluster_stats.nodes.jvm.max_uptime_in_millis',
        'cluster_stats.nodes.jvm.mem.heap_max_in_bytes',
        'cluster_stats.nodes.jvm.mem.heap_used_in_bytes',
        'cluster_stats.nodes.jvm.threads',
        'cluster_stats.nodes.jvm.versions.0.count',
        'cluster_stats.nodes.jvm.versions.0.version',
        'cluster_stats.nodes.jvm.versions.0.vm_name',
        'cluster_stats.nodes.jvm.versions.0.vm_vendor',
        'cluster_stats.nodes.jvm.versions.0.vm_version',
        'cluster_stats.nodes.network_types.http_types.security4',
        'cluster_stats.nodes.network_types.transport_types.security4',
        'cluster_stats.nodes.os.allocated_processors',
        'cluster_stats.nodes.os.available_processors',
        'cluster_stats.nodes.os.mem.free_in_bytes',
        'cluster_stats.nodes.os.mem.free_percent',
        'cluster_stats.nodes.os.mem.total_in_bytes',
        'cluster_stats.nodes.os.mem.used_in_bytes',
        'cluster_stats.nodes.os.mem.used_percent',
        'cluster_stats.nodes.os.names.0.count',
        'cluster_stats.nodes.os.names.0.name',
        'cluster_stats.nodes.os.pretty_names.0.count',
        'cluster_stats.nodes.os.pretty_names.0.pretty_name',
        'cluster_stats.nodes.process.cpu.percent',
        'cluster_stats.nodes.process.open_file_descriptors.avg',
        'cluster_stats.nodes.process.open_file_descriptors.max',
        'cluster_stats.nodes.process.open_file_descriptors.min',
        'cluster_stats.nodes.versions.0',
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
        'stack_stats.kibana.dashboard.total',
        'stack_stats.kibana.graph_workspace.total',
        'stack_stats.kibana.index_pattern.total',
        'stack_stats.kibana.indices',
        'stack_stats.kibana.os.platformReleases.0.count',
        'stack_stats.kibana.os.platformReleases.0.platformRelease',
        'stack_stats.kibana.os.platforms.0.count',
        'stack_stats.kibana.os.platforms.0.platform',
        'stack_stats.kibana.plugins.apm.has_any_services',
        'stack_stats.kibana.plugins.infraops.last_24_hours.hits.infraops_docker',
        'stack_stats.kibana.plugins.infraops.last_24_hours.hits.infraops_hosts',
        'stack_stats.kibana.plugins.infraops.last_24_hours.hits.infraops_kubernetes',
        'stack_stats.kibana.plugins.infraops.last_24_hours.hits.logs',
        'stack_stats.kibana.plugins.kql.defaultQueryLanguage',
        'stack_stats.kibana.plugins.kql.optInCount',
        'stack_stats.kibana.plugins.kql.optOutCount',
        'stack_stats.kibana.plugins.reporting.PNG.available',
        'stack_stats.kibana.plugins.reporting.PNG.total',
        'stack_stats.kibana.plugins.reporting._all',
        'stack_stats.kibana.plugins.reporting.available',
        'stack_stats.kibana.plugins.reporting.browser_type',
        'stack_stats.kibana.plugins.reporting.csv.available',
        'stack_stats.kibana.plugins.reporting.csv.total',
        'stack_stats.kibana.plugins.reporting.enabled',
        'stack_stats.kibana.plugins.reporting.last7Days.PNG.available',
        'stack_stats.kibana.plugins.reporting.last7Days.PNG.total',
        'stack_stats.kibana.plugins.reporting.last7Days._all',
        'stack_stats.kibana.plugins.reporting.last7Days.csv.available',
        'stack_stats.kibana.plugins.reporting.last7Days.csv.total',
        'stack_stats.kibana.plugins.reporting.last7Days.printable_pdf.app.dashboard',
        'stack_stats.kibana.plugins.reporting.last7Days.printable_pdf.app.visualization',
        'stack_stats.kibana.plugins.reporting.last7Days.printable_pdf.available',
        'stack_stats.kibana.plugins.reporting.last7Days.printable_pdf.layout.preserve_layout',
        'stack_stats.kibana.plugins.reporting.last7Days.printable_pdf.layout.print',
        'stack_stats.kibana.plugins.reporting.last7Days.printable_pdf.total',
        'stack_stats.kibana.plugins.reporting.lastDay.PNG.available',
        'stack_stats.kibana.plugins.reporting.lastDay.PNG.total',
        'stack_stats.kibana.plugins.reporting.lastDay._all',
        'stack_stats.kibana.plugins.reporting.lastDay.csv.available',
        'stack_stats.kibana.plugins.reporting.lastDay.csv.total',
        'stack_stats.kibana.plugins.reporting.lastDay.printable_pdf.app.dashboard',
        'stack_stats.kibana.plugins.reporting.lastDay.printable_pdf.app.visualization',
        'stack_stats.kibana.plugins.reporting.lastDay.printable_pdf.available',
        'stack_stats.kibana.plugins.reporting.lastDay.printable_pdf.layout.preserve_layout',
        'stack_stats.kibana.plugins.reporting.lastDay.printable_pdf.layout.print',
        'stack_stats.kibana.plugins.reporting.lastDay.printable_pdf.total',
        'stack_stats.kibana.plugins.reporting.printable_pdf.app.dashboard',
        'stack_stats.kibana.plugins.reporting.printable_pdf.app.visualization',
        'stack_stats.kibana.plugins.reporting.printable_pdf.available',
        'stack_stats.kibana.plugins.reporting.printable_pdf.layout.preserve_layout',
        'stack_stats.kibana.plugins.reporting.printable_pdf.layout.print',
        'stack_stats.kibana.plugins.reporting.printable_pdf.total',
        'stack_stats.kibana.plugins.rollups.index_patterns.total',
        'stack_stats.kibana.plugins.rollups.saved_searches.total',
        'stack_stats.kibana.plugins.rollups.visualizations.saved_searches.total',
        'stack_stats.kibana.plugins.rollups.visualizations.total',
        'stack_stats.kibana.plugins.spaces.available',
        'stack_stats.kibana.plugins.spaces.count',
        'stack_stats.kibana.plugins.spaces.enabled',
        'stack_stats.kibana.search.total',
        'stack_stats.kibana.timelion_sheet.total',
        'stack_stats.kibana.versions.0.count',
        'stack_stats.kibana.versions.0.version',
        'stack_stats.kibana.visualization.total',
        'stack_stats.xpack.graph.available',
        'stack_stats.xpack.graph.enabled',
        'stack_stats.xpack.logstash.available',
        'stack_stats.xpack.logstash.enabled',
        'stack_stats.xpack.ml.available',
        'stack_stats.xpack.ml.datafeeds._all.count',
        'stack_stats.xpack.ml.enabled',
        'stack_stats.xpack.ml.jobs._all.count',
        'stack_stats.xpack.ml.jobs._all.detectors.avg',
        'stack_stats.xpack.ml.jobs._all.detectors.max',
        'stack_stats.xpack.ml.jobs._all.detectors.min',
        'stack_stats.xpack.ml.jobs._all.detectors.total',
        'stack_stats.xpack.ml.jobs._all.forecasts.forecasted_jobs',
        'stack_stats.xpack.ml.jobs._all.forecasts.total',
        'stack_stats.xpack.ml.jobs._all.model_size.avg',
        'stack_stats.xpack.ml.jobs._all.model_size.max',
        'stack_stats.xpack.ml.jobs._all.model_size.min',
        'stack_stats.xpack.ml.jobs._all.model_size.total',
        'stack_stats.xpack.ml.node_count',
        'stack_stats.xpack.monitoring.available',
        'stack_stats.xpack.monitoring.collection_enabled',
        'stack_stats.xpack.monitoring.enabled',
        'stack_stats.xpack.monitoring.enabled_exporters.local',
        'stack_stats.xpack.rollup.available',
        'stack_stats.xpack.rollup.enabled',
        'stack_stats.xpack.security.anonymous.enabled',
        'stack_stats.xpack.security.audit.enabled',
        'stack_stats.xpack.security.audit.outputs.0',
        'stack_stats.xpack.security.available',
        'stack_stats.xpack.security.enabled',
        'stack_stats.xpack.security.ipfilter.http',
        'stack_stats.xpack.security.ipfilter.transport',
        'stack_stats.xpack.security.realms.active_directory.available',
        'stack_stats.xpack.security.realms.active_directory.enabled',
        'stack_stats.xpack.security.realms.file.available',
        'stack_stats.xpack.security.realms.file.cache.0.size',
        'stack_stats.xpack.security.realms.file.enabled',
        'stack_stats.xpack.security.realms.file.name.0',
        'stack_stats.xpack.security.realms.file.order.0',
        'stack_stats.xpack.security.realms.file.size.0',
        'stack_stats.xpack.security.realms.kerberos.available',
        'stack_stats.xpack.security.realms.kerberos.enabled',
        'stack_stats.xpack.security.realms.ldap.available',
        'stack_stats.xpack.security.realms.ldap.enabled',
        'stack_stats.xpack.security.realms.native.available',
        'stack_stats.xpack.security.realms.native.cache.0.size',
        'stack_stats.xpack.security.realms.native.enabled',
        'stack_stats.xpack.security.realms.native.name.0',
        'stack_stats.xpack.security.realms.native.order.0',
        'stack_stats.xpack.security.realms.native.size.0',
        'stack_stats.xpack.security.realms.pki.available',
        'stack_stats.xpack.security.realms.pki.enabled',
        'stack_stats.xpack.security.realms.saml.available',
        'stack_stats.xpack.security.realms.saml.enabled',
        'stack_stats.xpack.security.role_mapping.native.enabled',
        'stack_stats.xpack.security.role_mapping.native.size',
        'stack_stats.xpack.security.roles.file.dls',
        'stack_stats.xpack.security.roles.file.fls',
        'stack_stats.xpack.security.roles.file.size',
        'stack_stats.xpack.security.roles.native.dls',
        'stack_stats.xpack.security.roles.native.fls',
        'stack_stats.xpack.security.roles.native.size',
        'stack_stats.xpack.security.ssl.http.enabled',
        'stack_stats.xpack.security.ssl.transport.enabled',
        'stack_stats.xpack.sql.available',
        'stack_stats.xpack.sql.enabled',
        'stack_stats.xpack.sql.features.command',
        'stack_stats.xpack.sql.features.groupby',
        'stack_stats.xpack.sql.features.having',
        'stack_stats.xpack.sql.features.join',
        'stack_stats.xpack.sql.features.limit',
        'stack_stats.xpack.sql.features.local',
        'stack_stats.xpack.sql.features.orderby',
        'stack_stats.xpack.sql.features.subselect',
        'stack_stats.xpack.sql.features.where',
        'stack_stats.xpack.sql.queries._all.failed',
        'stack_stats.xpack.sql.queries._all.paging',
        'stack_stats.xpack.sql.queries._all.total',
        'stack_stats.xpack.sql.queries.canvas.failed',
        'stack_stats.xpack.sql.queries.canvas.paging',
        'stack_stats.xpack.sql.queries.canvas.total',
        'stack_stats.xpack.sql.queries.cli.failed',
        'stack_stats.xpack.sql.queries.cli.paging',
        'stack_stats.xpack.sql.queries.cli.total',
        'stack_stats.xpack.sql.queries.jdbc.failed',
        'stack_stats.xpack.sql.queries.jdbc.paging',
        'stack_stats.xpack.sql.queries.jdbc.total',
        'stack_stats.xpack.sql.queries.odbc.failed',
        'stack_stats.xpack.sql.queries.odbc.paging',
        'stack_stats.xpack.sql.queries.odbc.total',
        'stack_stats.xpack.sql.queries.rest.failed',
        'stack_stats.xpack.sql.queries.rest.paging',
        'stack_stats.xpack.sql.queries.rest.total',
        'stack_stats.xpack.sql.queries.translate.count',
        'stack_stats.xpack.watcher.available',
        'stack_stats.xpack.watcher.count.active',
        'stack_stats.xpack.watcher.count.total',
        'stack_stats.xpack.watcher.enabled',
        'stack_stats.xpack.watcher.execution.actions._all.total',
        'stack_stats.xpack.watcher.execution.actions._all.total_time_in_ms',
        'stack_stats.xpack.watcher.watch.input._all.active',
        'stack_stats.xpack.watcher.watch.input._all.total',
        'stack_stats.xpack.watcher.watch.trigger._all.active',
        'stack_stats.xpack.watcher.watch.trigger._all.total',
        'timestamp',
        'version',
      ];

      expect(actual).to.eql(expected);
    });

    it('should pull local stats and validate data types', async () => {
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

