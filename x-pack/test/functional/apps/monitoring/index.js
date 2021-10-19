/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('Monitoring app', function () {
    this.tags('ciGroup1');
    loadTestFile(require.resolve('./feature_controls'));

    loadTestFile(require.resolve('./cluster/list'));
    loadTestFile(require.resolve('./cluster/overview'));
    // loadTestFile(require.resolve('./cluster/license'));

    loadTestFile(require.resolve('./elasticsearch/overview'));
    loadTestFile(require.resolve('./elasticsearch/overview_mb'));
    loadTestFile(require.resolve('./elasticsearch/nodes'));
    loadTestFile(require.resolve('./elasticsearch/nodes_mb'));
    loadTestFile(require.resolve('./elasticsearch/node_detail'));
    loadTestFile(require.resolve('./elasticsearch/node_detail_mb'));
    loadTestFile(require.resolve('./elasticsearch/indices'));
    loadTestFile(require.resolve('./elasticsearch/indices_mb'));
    loadTestFile(require.resolve('./elasticsearch/index_detail'));
    loadTestFile(require.resolve('./elasticsearch/index_detail_mb'));
    loadTestFile(require.resolve('./elasticsearch/shards'));
    // loadTestFile(require.resolve('./elasticsearch/shard_activity'));

    loadTestFile(require.resolve('./kibana/overview'));
    loadTestFile(require.resolve('./kibana/overview_mb'));
    loadTestFile(require.resolve('./kibana/instances'));
    loadTestFile(require.resolve('./kibana/instances_mb'));
    loadTestFile(require.resolve('./kibana/instance'));
    loadTestFile(require.resolve('./kibana/instance_mb'));

    loadTestFile(require.resolve('./logstash/pipelines'));
    loadTestFile(require.resolve('./logstash/pipelines_mb'));

    loadTestFile(require.resolve('./beats/cluster'));
    loadTestFile(require.resolve('./beats/overview'));
    loadTestFile(require.resolve('./beats/listing'));
    loadTestFile(require.resolve('./beats/beat_detail'));

    loadTestFile(require.resolve('./time_filter'));
    loadTestFile(require.resolve('./enable_monitoring'));

    loadTestFile(require.resolve('./setup/metricbeat_migration'));
    loadTestFile(require.resolve('./setup/metricbeat_migration_mb'));
  });
}
