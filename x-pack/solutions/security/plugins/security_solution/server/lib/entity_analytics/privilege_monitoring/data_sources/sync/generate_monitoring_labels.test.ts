/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateMonitoringLabels } from './generate_monitoring_labels';

describe('generateMonitoringLabels', () => {
  const source = 'integration.okta';

  it('returns empty array when no matchers are provided', () => {
    const labels = generateMonitoringLabels(source, [], { any: 'thing' });
    expect(labels).toEqual([]);
  });

  it('matches a single string field value', () => {
    const matchers = [{ fields: ['user.role'], values: ['Admin', 'User'] }];
    const doc = { user: { role: 'Admin' } };

    const labels = generateMonitoringLabels(source, matchers, doc);

    expect(labels).toEqual([{ field: 'user.role', value: 'Admin', source }]);
  });

  it('matches multiple values in an array field', () => {
    const matchers = [
      {
        fields: ['user.roles'],
        values: ['Super Administrator', 'Application Administrator'],
      },
    ];
    const doc = {
      user: {
        roles: ['Super Administrator', 'Application Administrator', 'Some Other Role'],
      },
    };

    const labels = generateMonitoringLabels(source, matchers, doc);

    expect(labels).toEqual([
      { field: 'user.roles', value: 'Super Administrator', source },
      { field: 'user.roles', value: 'Application Administrator', source },
    ]);
  });

  it('supports nested paths', () => {
    const matchers = [{ fields: ['account.permissions.level'], values: ['read', 'write'] }];
    const doc = { account: { permissions: { level: 'write' } } };

    const labels = generateMonitoringLabels(source, matchers, doc);

    expect(labels).toEqual([{ field: 'account.permissions.level', value: 'write', source }]);
  });

  it('handles multiple fields in a single matcher', () => {
    const matchers = [{ fields: ['user.roles', 'group.roles'], values: ['Read-only', 'Editor'] }];
    const doc = {
      user: { roles: ['Editor'] },
      group: { roles: ['Read-only', 'Other'] },
    };

    const labels = generateMonitoringLabels(source, matchers, doc);

    expect(labels).toEqual([
      { field: 'user.roles', value: 'Editor', source },
      { field: 'group.roles', value: 'Read-only', source },
    ]);
  });

  it('does not return duplicates when array contains repeated matching values', () => {
    const matchers = [{ fields: ['user.roles'], values: ['Editor'] }];
    const doc = { user: { roles: ['Editor', 'Editor'] } };

    const labels = generateMonitoringLabels(source, matchers, doc);

    expect(labels).toEqual([{ field: 'user.roles', value: 'Editor', source }]);
  });

  it('handles non-string and non-array field values', () => {
    const matchers = [{ fields: ['user.roles', 'user.meta'], values: ['User'] }];
    const doc = { user: { roles: 123, meta: { role: 'User' } } };

    const labels = generateMonitoringLabels(source, matchers, doc);

    expect(labels).toEqual([]);
  });

  it('returns empty when fields exist but contain no matching values', () => {
    const matchers = [{ fields: ['user.roles'], values: ['Admin'] }];
    const doc = { user: { roles: ['Editor', 'Reader'] } };

    const labels = generateMonitoringLabels(source, matchers, doc);

    expect(labels).toEqual([]);
  });

  it('handles missing/undefined fields', () => {
    const matchers = [{ fields: ['missing.field'], values: ['anything'] }];
    const doc = { user: { roles: ['anything'] } };

    const labels = generateMonitoringLabels(source, matchers, doc);

    expect(labels).toEqual([]);
  });
});
