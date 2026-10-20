/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGetFieldsDataFromAlertSource } from './get_fields_data_from_alert_source';

describe('createGetFieldsDataFromAlertSource', () => {
  it('returns host.name and user.name from flat ECS slices on _source', () => {
    const getFieldsData = createGetFieldsDataFromAlertSource({
      host: { name: 'host-a', id: 'uuid-host' },
      user: { name: 'alice' },
      '@timestamp': '2025-01-01T00:00:00.000Z',
    });

    expect(getFieldsData('host.name')).toBe('host-a');
    expect(getFieldsData('user.name')).toBe('alice');
    expect(getFieldsData('host.id')).toBe('uuid-host');
    expect(getFieldsData('@timestamp')).toBe('2025-01-01T00:00:00.000Z');
  });

  it('returns undefined for missing fields', () => {
    const getFieldsData = createGetFieldsDataFromAlertSource({ host: { name: 'h' } });

    expect(getFieldsData('user.name')).toBeUndefined();
  });
});
