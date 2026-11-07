/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { loadMatrixConfig } from './load_matrix_config';

const CONFIG_DIR = Path.resolve(__dirname, '../../config');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('bundled matrix configs', () => {
  const configFiles = Fs.readdirSync(CONFIG_DIR).filter((file) => file.endsWith('.json'));

  it('finds at least one config', () => {
    expect(configFiles.length).toBeGreaterThan(0);
  });

  it.each(configFiles)('%s loads through the real loader', (file) => {
    const config = loadMatrixConfig(Path.join(CONFIG_DIR, file));
    expect(config.columns.length).toBeGreaterThan(0);
  });

  it.each(configFiles)('%s only scopes columns by datasetIds that are dataset UUIDs', (file) => {
    const { columns } = loadMatrixConfig(Path.join(CONFIG_DIR, file));
    const nonUuidDatasetIds = columns.flatMap(({ id, datasetIds }) =>
      [datasetIds ?? []]
        .flat()
        .filter((datasetId) => !UUID_PATTERN.test(datasetId))
        .map((datasetId) => `${id}: ${datasetId}`)
    );
    expect(nonUuidDatasetIds).toEqual([]);
  });

  // The persona-matrix suite writes one dataset whose example ids are `<persona>-<variant>`, so
  // a column must select its examples by prefix; those names are not dataset ids.
  it('security_matrix_persona.json scopes every column by examplePrefixes', () => {
    const { columns } = loadMatrixConfig(Path.join(CONFIG_DIR, 'security_matrix_persona.json'));
    expect(columns).toHaveLength(21);
    for (const column of columns) {
      expect(column.datasetIds).toBeUndefined();
      expect([column.examplePrefixes ?? []].flat().length).toBeGreaterThan(0);
    }
  });
});
