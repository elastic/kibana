/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTree, getIndexPatterns } from './utils';

const indices = [
  'employees-development.evaluations.2026.01.13',
  'employees-production.evaluations.2006.10.01',
  'employees-staging.evaluations.2040.09.12',
  'logs-development.evaluations.2005.07.06',
  'logs-production.evaluations.2002.11.03',
  'logs-staging.evaluations.2014.01.15',
  'metricbeat-development.evaluations-2036.11.27',
  'metricbeat-production.evaluations-2025.03.15',
  'metricbeat-staging.evaluations-2001.03.23',
  'metrics-apm-development.evaluations.2007.03.23',
  'metrics-apm-development.evaluations.2047.08.12',
  'metrics-apm-production.evaluations.2009.02.15',
  'metrics-apm-production.evaluations.2025.09.27',
  'metrics-apm-staging.evaluations.2041.12.06',
  'metrics-apm-staging.evaluations.2043.10.20',
  'metrics-endpoint.metadata_current_default',
  'nyc_taxis-development.evaluations.2020.09.10',
  'nyc_taxis-production.evaluations.2007.02.06',
  'nyc_taxis-staging.evaluations.2002.08.21',
  'packetbeat-development.evaluations.2040.06.19',
  'packetbeat-production.evaluations.2047.07.24',
  'packetbeat-staging.evaluations.2043.06.26',
  'postgres-logs-development.evaluations.2035.11.24',
  'postgres-logs-production.evaluations.2050.11.01',
  'postgres-logs-staging.evaluations.2034.07.14',
  'traces-apm-development.evlauations.2006.01.28',
  'traces-apm-development.evlauations.2006.09.09',
  'traces-apm-production.evlauations.2016.12.18',
  'traces-apm-production.evlauations.2037.08.13',
  'traces-apm-staging.evlauations.2028.11.05',
  'traces-apm-staging.evlauations.2029.06.14',
  'traches-aapm-staging.evlauations.2029.06.14',
];

describe('convertIndicesToIndexPatterns', () => {
  it('should convert indices to index patterns', async () => {
    const tree = await buildTree(indices);
    const result = getIndexPatterns(tree, { ignoreDigitParts: true });
    expect(result.indexPatterns).toEqual([
      'employees-*',
      'logs-*',
      'metricbeat-*',
      'metrics-*',
      'metrics-apm-*',
      'metrics-apm-development.evaluations.*',
      'metrics-apm-production.evaluations.*',
      'metrics-apm-staging.evaluations.*',
      'nyc_taxis-*',
      'packetbeat-*',
      'postgres-logs-*',
      'traces-apm-*',
      'traces-apm-production.evlauations.*',
      'traces-apm-staging.evlauations.*',
    ]);
    expect(result.remainingIndices).toContain('traches-aapm-staging.evlauations.2029.06.14');
  });
});
