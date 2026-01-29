/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildBrowserFields } from './build_browser_fields';
import { DataView } from '@kbn/data-views-plugin/public';
import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';

const createDataView = (fields: Array<Partial<FieldSpec>>, id = 'test-id'): DataView => {
  // DataView expects a spec with a fields object keyed by field name
  const spec: DataViewSpec = {
    id,
    title: 'test-title',
    fields: fields.reduce((acc, f) => {
      if (f.name !== undefined) {
        acc[f.name] = {
          name: f.name,
          type: f.type ?? 'string',
          esTypes: ['keyword'],
          aggregatable: true,
          searchable: true,
          scripted: false,
        };
      }
      return acc;
    }, {} as Record<string, FieldSpec>),
  };
  // @ts-expect-error: DataView constructor expects more, but this is enough for our test
  return new DataView({ spec, fieldFormats: { getDefaultInstance: () => ({}) } });
};

describe('buildBrowserFields', () => {
  it('returns empty browserFields for empty array', () => {
    const dataView = createDataView([]);
    const result = buildBrowserFields(dataView.fields);
    expect(result).toEqual({});
  });

  it('groups fields by category', () => {
    const dataView = createDataView([
      { name: 'host.name' },
      { name: 'host.ip' },
      { name: 'user.name' },
      { name: 'event.category' },
      { name: 'event.action' },
      { name: 'basefield' },
    ]);
    const result = buildBrowserFields(dataView.fields);
    expect(result).toHaveProperty('host');
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('event');
    expect(result).toHaveProperty('base');
    expect(result.host.fields).toHaveProperty(['host.name']);
    expect(result.host.fields).toHaveProperty(['host.ip']);
    expect(result.user.fields).toHaveProperty(['user.name']);
    expect(result.event.fields).toHaveProperty(['event.category']);
    expect(result.event.fields).toHaveProperty(['event.action']);
    expect(result.base.fields).toHaveProperty(['basefield']);
  });

  it('handles fields with missing type gracefully', () => {
    const dataView = createDataView([{ name: 'host.name' }]);
    // Remove type from the DataViewField
    // @ts-expect-error
    dataView.getFieldByName('host.name').spec.type = undefined;
    const result = buildBrowserFields(dataView.fields);
    expect(result.host.fields).toHaveProperty(['host.name']);
    expect(result.host.fields['host.name'].type).toBeUndefined();
  });
});
