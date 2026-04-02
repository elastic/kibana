/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postProcessEsqlResults } from './postprocess_records';

describe('communicates_with postProcessEsqlResults', () => {
  const baseColumns = [
    { name: 'actorUserId', type: 'keyword' },
    { name: 'communicates_with', type: 'keyword' },
  ];

  it('reads entityId directly from actorUserId column', () => {
    const values = [['user:alice@acme', ['service:s3.amazonaws.com']]];
    const result = postProcessEsqlResults(baseColumns, values, 'user');

    expect(result[0].entityId).toBe('user:alice@acme');
  });

  it('sets entityId to null when actorUserId is missing', () => {
    const columns = [{ name: 'communicates_with', type: 'keyword' }];
    const values = [['service:s3.amazonaws.com']];

    const result = postProcessEsqlResults(columns, values as unknown[][], 'user');

    expect(result[0].entityId).toBeNull();
  });

  it('maps columns to fields by position', () => {
    const values = [['user:alice@acme', ['service:s3.amazonaws.com']]];
    const result = postProcessEsqlResults(baseColumns, values, 'user');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      entityId: 'user:alice@acme',
      entityType: 'user',
      communicates_with: ['service:s3.amazonaws.com'],
    });
  });

  it('attaches the provided entityType to each record', () => {
    const values = [['user:alice@acme', ['service:s3.amazonaws.com']]];
    const result = postProcessEsqlResults(baseColumns, values, 'host');
    expect(result[0].entityType).toBe('host');
  });

  it('returns empty array when values is empty', () => {
    expect(postProcessEsqlResults(baseColumns, [], 'user')).toEqual([]);
  });

  it('handles null communicates_with as empty array', () => {
    const values = [['user:bob@acme', null]];
    const result = postProcessEsqlResults(baseColumns, values, 'user');
    expect(result[0].communicates_with).toEqual([]);
  });

  it('handles scalar string communicates_with as single-element array', () => {
    const values = [['user:alice@acme', 'service:s3.amazonaws.com']];
    const result = postProcessEsqlResults(baseColumns, values, 'user');
    expect(result[0].communicates_with).toEqual(['service:s3.amazonaws.com']);
  });

  it('handles multi-value array in communicates_with', () => {
    const targets = ['service:s3.amazonaws.com', 'service:ec2.amazonaws.com'];
    const values = [['user:alice@acme', targets]];
    const result = postProcessEsqlResults(baseColumns, values, 'user');
    expect(result[0].communicates_with).toEqual(targets);
  });

  it('filters non-string values out of communicates_with array', () => {
    const values = [['user:alice@acme', ['service:s3', 42, null, 'service:ec2']]];
    const result = postProcessEsqlResults(baseColumns, values, 'user');
    expect(result[0].communicates_with).toEqual(['service:s3', 'service:ec2']);
  });

  it('drops non-string scalar communicates_with value', () => {
    const values = [['user:alice@acme', 99]];
    const result = postProcessEsqlResults(baseColumns, values, 'user');
    expect(result[0].communicates_with).toEqual([]);
  });

  it('processes multiple rows independently', () => {
    const values = [
      ['user:alice@acme', ['service:s3.amazonaws.com']],
      ['user:bob@acme', 'service:Microsoft Teams'],
    ];
    const result = postProcessEsqlResults(baseColumns, values, 'user');

    expect(result).toHaveLength(2);
    expect(result[0].entityId).toBe('user:alice@acme');
    expect(result[1].entityId).toBe('user:bob@acme');
    expect(result[1].communicates_with).toEqual(['service:Microsoft Teams']);
  });
});
