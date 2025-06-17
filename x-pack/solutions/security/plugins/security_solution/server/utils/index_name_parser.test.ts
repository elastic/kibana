/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineIndexWithNamespaces } from './index_name_parser';

describe('combineIndexWithNamespaces', () => {
  describe('valid cases', () => {
    test.each([
      {
        description: 'single namespace with .* pattern',
        indexName: 'logs-endpoint.events.*',
        integrationNamespaces: { endpoint: ['default'] },
        integrationName: 'endpoint',
        expected: 'logs-endpoint.events.*-default',
      },
      {
        description: 'multiple namespaces with .* pattern',
        indexName: 'logs-endpoint.events.*',
        integrationNamespaces: { endpoint: ['default', 'prod', 'staging'] },
        integrationName: 'endpoint',
        expected:
          'logs-endpoint.events.*-default,logs-endpoint.events.*-prod,logs-endpoint.events.*-staging',
      },
      {
        description: 'single namespace with -* pattern',
        indexName: 'logs-endpoint.events.file-*',
        integrationNamespaces: { endpoint: ['default'] },
        integrationName: 'endpoint',
        expected: 'logs-endpoint.events.file-default',
      },
      {
        description: 'multiple namespaces with -* pattern',
        indexName: 'logs-endpoint.events.file-*',
        integrationNamespaces: { endpoint: ['default', 'prod'] },
        integrationName: 'endpoint',
        expected: 'logs-endpoint.events.file-default,logs-endpoint.events.file-prod',
      },
      {
        description: 'different integration name',
        indexName: 'logs-fleet-server.*',
        integrationNamespaces: { 'fleet-server': ['custom'] },
        integrationName: 'fleet-server',
        expected: 'logs-fleet-server.*-custom',
      },
      {
        description: 'different index pattern with .*',
        indexName: 'logs-endpoint.alerts.*',
        integrationNamespaces: { endpoint: ['default'] },
        integrationName: 'endpoint',
        expected: 'logs-endpoint.alerts.*-default',
      },
    ])(
      'should handle $description',
      ({ indexName, integrationNamespaces, integrationName, expected }) => {
        const result = combineIndexWithNamespaces(
          indexName,
          integrationNamespaces as unknown as Record<string, string[]>,
          integrationName
        );
        expect(result).toBe(expected);
      }
    );
  });

  describe('invalid cases - should return empty string', () => {
    test.each([
      {
        description: 'integration does not exist in namespaces object',
        indexName: 'logs-endpoint.events.*',
        integrationNamespaces: { other_integration: ['default'] },
        integrationName: 'endpoint',
      },
      {
        description: 'empty namespaces array',
        indexName: 'logs-endpoint.events.*',
        integrationNamespaces: { endpoint: [] },
        integrationName: 'endpoint',
      },
      {
        description: 'integration name does not exist in object',
        indexName: 'logs-endpoint.events.*',
        integrationNamespaces: {},
        integrationName: 'endpoint',
      },
      {
        description: 'index pattern without .* or -* suffix',
        indexName: 'logs-endpoint.events',
        integrationNamespaces: { endpoint: ['default'] },
        integrationName: 'endpoint',
      },
      {
        description: 'index pattern with invalid suffix',
        indexName: 'logs-endpoint.events-something',
        integrationNamespaces: { endpoint: ['default'] },
        integrationName: 'endpoint',
      },
    ])(
      'should return empty string when $description',
      ({ indexName, integrationNamespaces, integrationName }) => {
        const result = combineIndexWithNamespaces(
          indexName,
          integrationNamespaces as unknown as Record<string, string[]>,
          integrationName
        );
        expect(result).toBe('');
      }
    );
  });
});
