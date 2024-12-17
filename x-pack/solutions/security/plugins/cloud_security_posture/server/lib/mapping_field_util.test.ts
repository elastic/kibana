/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  toBenchmarkDocFieldKey,
  toBenchmarkMappingFieldKey,
  MAPPING_VERSION_DELIMITER,
} from './mapping_field_util'; // replace 'yourFile' with the actual file name

describe('Benchmark Field Key Functions', () => {
  const sampleBenchmarkId = 'cis_aws';
  const sampleBenchmarkVersion = '1.0.0';

  it('toBenchmarkDocFieldKey should keep the same benchmark id and version key for benchmark document', () => {
    const result = toBenchmarkDocFieldKey(sampleBenchmarkId, sampleBenchmarkVersion);
    const expected = `${sampleBenchmarkId};${sampleBenchmarkVersion}`;
    expect(result).toEqual(expected);
  });

  it('toBenchmarkDocFieldKey should convert benchmark version with . delimiter correctly', () => {
    const benchmarkVersionWithDelimiter = '1_0_0';
    const result = toBenchmarkDocFieldKey(sampleBenchmarkId, benchmarkVersionWithDelimiter);
    const expected = `${sampleBenchmarkId};1.0.0`;
    expect(result).toEqual(expected);
  });

  it('toBenchmarkMappingFieldKey should convert benchmark version with _ delimiter correctly', () => {
    const result = toBenchmarkMappingFieldKey(sampleBenchmarkVersion);
    const expected = '1_0_0';
    expect(result).toEqual(expected);
  });

  it('toBenchmarkMappingFieldKey should handle benchmark version with dots correctly', () => {
    const benchmarkVersionWithDots = '1.0.0';
    const result = toBenchmarkMappingFieldKey(benchmarkVersionWithDots);
    const expected = '1_0_0';
    expect(result).toEqual(expected);
  });

  it('MAPPING_VERSION_DELIMITER should be an underscore', () => {
    expect(MAPPING_VERSION_DELIMITER).toBe('_');
  });
});
