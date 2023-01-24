/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('Monitoring', () => {
    loadTestFile(require.resolve('./apm'));
    loadTestFile(require.resolve('./beats'));
    loadTestFile(require.resolve('./cluster'));
    loadTestFile(require.resolve('./elasticsearch'));
    loadTestFile(require.resolve('./elasticsearch_settings'));
    loadTestFile(require.resolve('./kibana'));
    loadTestFile(require.resolve('./logstash'));
    loadTestFile(require.resolve('./common'));
    loadTestFile(require.resolve('./standalone_cluster'));
    loadTestFile(require.resolve('./logs'));
    loadTestFile(require.resolve('./setup'));
    loadTestFile(require.resolve('./_health'));
  });
}
