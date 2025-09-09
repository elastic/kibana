/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_BROWSER_FIELDS_CACHE_SIZE,
  browserFieldsManager,
} from './security_browser_fields_manager';
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

describe('browserFieldsManager', () => {
  beforeEach(() => {
    browserFieldsManager.clearCache();
  });

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

  describe('memoization', () => {
    it('should memoize browserFields for the same dataView', () => {
      const dataView = createDataView([{ name: 'host.name' }]);
      const result1 = browserFieldsManager.getBrowserFields(dataView);
      const result2 = browserFieldsManager.getBrowserFields(dataView);
      expect(result1).toBe(result2);
    });

    it('should return different cached browserfields for dataViews with different ids', () => {
      const dataView1 = createDataView([{ name: 'host.name' }]);
      const dataView2 = createDataView([{ name: 'host.name' }], 'new-id');
      const result1 = browserFieldsManager.getBrowserFields(dataView1);
      const result2 = browserFieldsManager.getBrowserFields(dataView2);
      expect(result1).not.toBe(result2);
      expect(result1.browserFields).toEqual(result2.browserFields);
      expect(result1.browserFields.host).toEqual(result2.browserFields.host);
    });

    it(`should remove the oldest cached item when the cache exceeds the maximum size of ${MAX_BROWSER_FIELDS_CACHE_SIZE}`, () => {
      const dataViews = [];
      const cacheSizeExcessCount = 2;
      const totalDataViewsToCreate = MAX_BROWSER_FIELDS_CACHE_SIZE + cacheSizeExcessCount;

      for (let i = 0; i < totalDataViewsToCreate; i += 1) {
        dataViews.push(createDataView([{ name: `field${i}` }], `id-${i}`));
      }

      // With the limit on the cache set to 10, adding 12 dataViews should remove the first two added
      // Id's "id-0" and "id-1" should be removed from the cache
      const results = dataViews.map((dv) => browserFieldsManager.getBrowserFields(dv));

      // After the the two `getBrowserFields` calls below, the next two ids to be removed should be "id-2" and "id-3"
      // with "id-4" being the oldest remaining in the cache
      const result1Again = browserFieldsManager.getBrowserFields(dataViews[0]);
      const result2Again = browserFieldsManager.getBrowserFields(dataViews[1]);
      expect(results[0]).not.toBe(result1Again);
      expect(results[1]).not.toBe(result2Again);

      // Only ids "id-4" to "id-11" should remain from the original cache.
      for (let i = 4; i < 12; i += 1) {
        const resultAgain = browserFieldsManager.getBrowserFields(dataViews[i]);
        expect(results[i]).toBe(resultAgain);
      }
    });

    it('should remove from the cache correctly', () => {
      const dataView1 = createDataView([{ name: 'host.name' }]);
      const dataView2 = createDataView([{ name: 'host.name' }], 'still-cached-id');
      const result1 = browserFieldsManager.getBrowserFields(dataView1);
      const result2 = browserFieldsManager.getBrowserFields(dataView2);
      browserFieldsManager.removeFromCache(dataView1.id);
      const newResult1 = browserFieldsManager.getBrowserFields(dataView1);
      const sameResult2 = browserFieldsManager.getBrowserFields(dataView2);
      expect(result1).not.toBe(newResult1);
      expect(result2).toBe(sameResult2);
    });

    it('should clear the entire cache when clearCache is called', () => {
      const dataView1 = createDataView([{ name: 'host.name' }]);
      const dataView2 = createDataView([{ name: 'user.name' }], 'other-id');
      const result1 = browserFieldsManager.getBrowserFields(dataView1);
      const result2 = browserFieldsManager.getBrowserFields(dataView2);
      browserFieldsManager.clearCache();
      const result3 = browserFieldsManager.getBrowserFields(dataView1);
      const result4 = browserFieldsManager.getBrowserFields(dataView2);
      expect(result1).not.toBe(result3);
      expect(result2).not.toBe(result4);
    });
  });
});
