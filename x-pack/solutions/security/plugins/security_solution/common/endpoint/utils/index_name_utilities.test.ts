/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildIndexNameWithNamespace } from './index_name_utilities';

describe('index name utilities', () => {
  describe('buildIndexNameWithNamespace()', () => {
    test.each(['logs-endpoint.foo', 'logs-endpoint.foo-', 'logs-endpoint.foo-*'])(
      `should build correct index name for: %s`,
      (prefix) => {
        expect(buildIndexNameWithNamespace(prefix, 'bar')).toEqual('logs-endpoint.foo-bar');
      }
    );
  });
});
