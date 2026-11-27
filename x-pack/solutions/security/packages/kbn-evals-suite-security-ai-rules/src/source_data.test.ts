/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findUncoveredPatterns,
  getReferencedIndexPatterns,
  getSourceDataPlan,
  createSourceDataRunId,
} from './source_data';

describe('security-ai-rules source data', () => {
  const runId = 'air-test0001';

  it('references the index patterns used by the datasets', () => {
    expect(getReferencedIndexPatterns()).toEqual(
      expect.arrayContaining([
        'logs-endpoint.events.*',
        'logs-aws.cloudtrail*',
        'logs-o365.audit*',
        '.alerts-security.*',
      ])
    );
  });

  it('seeds at least one index for every index pattern the datasets reference', () => {
    const indices = getSourceDataPlan(runId).map(({ index }) => index);
    expect(findUncoveredPatterns(getReferencedIndexPatterns(), indices)).toEqual([]);
  });

  it('reports a referenced pattern that has no seeded index', () => {
    const indices = getSourceDataPlan(runId)
      .map(({ index }) => index)
      .filter((index) => !index.startsWith('logs-aws.cloudtrail'));
    expect(findUncoveredPatterns(getReferencedIndexPatterns(), indices)).toEqual([
      'logs-aws.cloudtrail*',
    ]);
  });

  it('maps every seeded field, with ip fields typed as ip', () => {
    for (const { document, mappings } of getSourceDataPlan(runId)) {
      expect(Object.keys(mappings.properties).sort()).toEqual(Object.keys(document).sort());
    }
    const process = getSourceDataPlan(runId)[0];
    expect(process.mappings.properties['source.ip']).toEqual({ type: 'ip' });
  });

  it('labels every document with the run ID and rejects unsafe run IDs', () => {
    for (const { document } of getSourceDataPlan(runId)) {
      expect(document['labels.security_ai_rules_seed']).toBe(runId);
    }
    expect(() => getSourceDataPlan('Bad Id*')).toThrow();
    expect(createSourceDataRunId()).toMatch(/^air-[a-z0-9]+$/);
  });
});
