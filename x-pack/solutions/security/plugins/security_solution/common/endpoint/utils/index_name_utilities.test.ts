/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildIndexNameWithNamespace } from './index_name_utilities';

describe('index name utilities', () => {
  describe('buildIndexNameWithNamespace()', () => {
    describe('default behavior (preserveWildcard: false)', () => {
      test.each(['logs-endpoint.foo', 'logs-endpoint.foo-', 'logs-endpoint.foo-*'])(
        `should build correct index name for: %s`,
        (prefix) => {
          expect(buildIndexNameWithNamespace(prefix, 'bar')).toEqual('logs-endpoint.foo-bar');
        }
      );

      test('should handle .* patterns by removing only the asterisk (default behavior)', () => {
        expect(buildIndexNameWithNamespace('logs-endpoint.events.*', 'default')).toEqual(
          'logs-endpoint.events.-default'
        );
      });
    });

    describe('with preserveWildcard: true', () => {
      test('should preserve .* patterns when preserveWildcard is true', () => {
        expect(
          buildIndexNameWithNamespace('logs-endpoint.events.*', 'default', {
            preserveWildcard: true,
          })
        ).toEqual('logs-endpoint.events.*-default');
      });

      test('should preserve .* patterns with different namespaces', () => {
        expect(
          buildIndexNameWithNamespace('logs-foo.bar.*', 'custom-space', {
            preserveWildcard: true,
          })
        ).toEqual('logs-foo.bar.*-custom-space');
      });

      test('should still handle regular patterns normally when preserveWildcard is true', () => {
        expect(
          buildIndexNameWithNamespace('logs-endpoint.foo-*', 'bar', {
            preserveWildcard: true,
          })
        ).toEqual('logs-endpoint.foo-bar');
      });

      test('should handle patterns without wildcards normally when preserveWildcard is true', () => {
        expect(
          buildIndexNameWithNamespace('logs-endpoint.foo', 'bar', {
            preserveWildcard: true,
          })
        ).toEqual('logs-endpoint.foo-bar');
      });
    });

    describe('with preserveWildcard: false (explicit)', () => {
      test('should handle .* patterns by removing only the asterisk when explicitly set to false', () => {
        expect(
          buildIndexNameWithNamespace('logs-endpoint.events.*', 'default', {
            preserveWildcard: false,
          })
        ).toEqual('logs-endpoint.events.-default');
      });
    });
  });
});
