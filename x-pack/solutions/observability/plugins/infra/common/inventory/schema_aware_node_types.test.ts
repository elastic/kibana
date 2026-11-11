/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSchemaAwareNodeType } from './schema_aware_node_types';

describe('isSchemaAwareNodeType', () => {
  it('accepts host and pod', () => {
    expect(isSchemaAwareNodeType('host')).toBe(true);
    expect(isSchemaAwareNodeType('pod')).toBe(true);
  });

  it('rejects node types that have no schema selector', () => {
    expect(isSchemaAwareNodeType('container')).toBe(false);
    expect(isSchemaAwareNodeType('awsEC2')).toBe(false);
    expect(isSchemaAwareNodeType('awsS3')).toBe(false);
  });
});
