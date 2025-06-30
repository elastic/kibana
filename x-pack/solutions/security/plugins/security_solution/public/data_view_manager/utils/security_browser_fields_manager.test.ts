/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { browserFieldsManager } from './security_browser_fields_manager';
import { DataView } from '@kbn/data-views-plugin/public';
import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';
import { DataViewManagerScopeName } from '../constants';

const createDataView = (fields: Array<Partial<FieldSpec>>): DataView => {
  // DataView expects a spec with a fields object keyed by field name
  const spec: DataViewSpec = {
    id: 'test-id',
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

describe('browserFieldsManager', () => {
  it('returns empty browserFields for empty array', () => {
    const dataView = createDataView([]);
    const result = browserFieldsManager.getBrowserFields(dataView);
    expect(result.browserFields).toEqual({});
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
    const result = browserFieldsManager.getBrowserFields(dataView);
    expect(result.browserFields).toHaveProperty('host');
    expect(result.browserFields).toHaveProperty('user');
    expect(result.browserFields).toHaveProperty('event');
    expect(result.browserFields).toHaveProperty('base');
    expect(result.browserFields.host.fields).toHaveProperty(['host.name']);
    expect(result.browserFields.host.fields).toHaveProperty(['host.ip']);
    expect(result.browserFields.user.fields).toHaveProperty(['user.name']);
    expect(result.browserFields.event.fields).toHaveProperty(['event.category']);
    expect(result.browserFields.event.fields).toHaveProperty(['event.action']);
    expect(result.browserFields.base.fields).toHaveProperty(['basefield']);
  });

  it('handles fields with missing type gracefully', () => {
    const dataView = createDataView([{ name: 'host.name' }]);
    // Remove type from the DataViewField
    // @ts-expect-error
    dataView.getFieldByName('host.name').spec.type = undefined;
    const result = browserFieldsManager.getBrowserFields(dataView);
    expect(result.browserFields.host.fields).toHaveProperty(['host.name']);
    expect(result.browserFields.host.fields['host.name'].type).toBeUndefined();
  });

  it('should not memoize when different fields are provided', () => {
    const dataView1 = createDataView([{ name: 'host.name' }]);
    const dataView2 = createDataView([{ name: 'user.name' }]);
    const result1 = browserFieldsManager.getBrowserFields(dataView1);
    const result2 = browserFieldsManager.getBrowserFields(dataView2);
    expect(result1).not.toBe(result2);
  });

  it('should memoize browserFields', () => {
    const dataView = createDataView([{ name: 'host.name' }]);
    const result1 = browserFieldsManager.getBrowserFields(
      dataView,
      DataViewManagerScopeName.detections
    );
    const result2 = browserFieldsManager.getBrowserFields(
      dataView,
      DataViewManagerScopeName.detections
    );
    expect(result1).toBe(result2);
  });

  it('should clear cache correctly', () => {
    const dataView = createDataView([{ name: 'host.name' }]);
    const result1 = browserFieldsManager.getBrowserFields(
      dataView,
      DataViewManagerScopeName.detections
    );
    browserFieldsManager.clearCache();
    const result2 = browserFieldsManager.getBrowserFields(
      dataView,
      DataViewManagerScopeName.detections
    );
    expect(result1).not.toBe(result2);
  });
});
