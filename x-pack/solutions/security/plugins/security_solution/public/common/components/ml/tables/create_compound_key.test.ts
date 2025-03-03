/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { createCompoundAnomalyKey } from './create_compound_key';

describe('create_explorer_link', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('it creates a compound anomaly key', () => {
    const key = createCompoundAnomalyKey(anomalies.anomalies[0]);
    expect(key).toEqual('process.name-du-16.193669439507826-job-1');
  });
});
