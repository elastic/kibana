/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { profilingElasticsearchConfigSchema } from './config';

const wrappingSchema = schema.object({ elasticsearch: profilingElasticsearchConfigSchema });

const remoteCluster = {
  hosts: 'https://remote.es.example.com:9243',
  username: 'elastic',
  password: 'changeme',
};

describe('profilingElasticsearchConfigSchema', () => {
  it('accepts a remote cluster when running from source', () => {
    expect(wrappingSchema.validate({ elasticsearch: remoteCluster }, { dist: false })).toEqual({
      elasticsearch: remoteCluster,
    });
  });

  it('rejects a remote cluster in a distribution', () => {
    expect(() =>
      wrappingSchema.validate({ elasticsearch: remoteCluster }, { dist: true })
    ).toThrowError(/a value wasn't expected to be present/);
  });

  it('is optional in a distribution when unset', () => {
    expect(wrappingSchema.validate({}, { dist: true })).toEqual({});
  });
});
