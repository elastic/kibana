/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAPPING_VERSION_DELIMITER = '_';

/*
 * The latest finding index store benchmark version field value `v1.2.0`
 * when we store the benchmark id and version field name in the benchmark scores index,
 * we need benchmark version with  _ delimiter to avoid JSON mapping for each dot notation
 * to be read as key. e.g. `v1.2.0` will be `v1_2_0`
 */

export const toBenchmarkDocFieldKey = (benchmarkId: string, benchmarkVersion: string) =>
  benchmarkVersion.includes(MAPPING_VERSION_DELIMITER)
    ? `${benchmarkId};${benchmarkVersion.replaceAll('_', '.')}`
    : `${benchmarkId};${benchmarkVersion}`;

export const toBenchmarkMappingFieldKey = (benchmarkVersion: string) =>
  `${benchmarkVersion.replaceAll('.', '_')}`;
