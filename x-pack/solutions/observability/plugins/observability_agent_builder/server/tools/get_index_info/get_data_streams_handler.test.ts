/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractDataset } from './get_data_streams_handler';

describe('extractDataset', () => {
  describe('classic Fleet format ({type}-{dataset}-{namespace})', () => {
    it.each([
      ['metrics-system.memory-default', 'system.memory'],
      ['logs-nginx.access-production', 'nginx.access'],
      ['traces-apm.transaction-default', 'apm.transaction'],
      ['logs-some.dataset-with-dashes-ns', 'some.dataset-with-dashes'],
    ])('extracts dataset from "%s" → "%s"', (name, expected) => {
      expect(extractDataset(name)).toBe(expected);
    });
  });

  describe('Streams dot-hierarchy format ({type}.{rest})', () => {
    it.each([
      ['logs.ecs.nginx', 'ecs.nginx'],
      ['metrics.system.cpu', 'system.cpu'],
      ['traces.apm.spans', 'apm.spans'],
      ['logs.aws-lambda-payment-gateway', 'aws-lambda-payment-gateway'],
    ])('extracts dataset from "%s" → "%s"', (name, expected) => {
      expect(extractDataset(name)).toBe(expected);
    });
  });

  describe('fallback for unrecognised names', () => {
    it('returns the name unchanged when no pattern matches', () => {
      expect(extractDataset('unknown')).toBe('unknown');
    });
  });
});
