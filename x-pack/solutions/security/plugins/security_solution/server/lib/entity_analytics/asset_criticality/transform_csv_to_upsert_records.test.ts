/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformCSVToUpsertRecords } from './transform_csv_to_upsert_records';

describe('transformCSVToUpsertRecords', () => {
  it('should transform a valid row', (done) => {
    const stream = transformCSVToUpsertRecords();
    stream.on('data', (data) => {
      expect(data).toEqual({
        idField: 'host.name',
        idValue: 'host-1',
        criticalityLevel: 'low_impact',
      });
      done();
    });
    stream.write(['host', 'host-1', 'low_impact']);
  });

  it('Should stream invalid rows not emit error', (done) => {
    const stream = transformCSVToUpsertRecords();
    stream.on('data', (data) => {
      expect(data).toBeInstanceOf(Error);
      done();
    });
    stream.write(['host', 'host-1']);
  });
});
