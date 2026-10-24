/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { uxSearchIndex } from '../../../common/otel_rum';
import { resolveUxAppControlDataView } from './resolve_app_control_data_view';

const field = (name: string, aggregatable = true) => ({ name, aggregatable });

const mockDataViews = (
  overrides: Partial<DataViewsPublicPluginStart> & {
    fields?: Record<string, { name: string; aggregatable?: boolean }>;
  } = {}
): DataViewsPublicPluginStart => {
  const { fields = {}, ...rest } = overrides;
  const dataView = {
    id: 'dv-created',
    getFieldByName: (name: string) => fields[name],
  };
  return {
    getIdsWithTitle: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(dataView),
    create: jest.fn().mockResolvedValue(dataView),
    createSavedObject: jest.fn().mockResolvedValue(undefined),
    createAndSave: jest.fn().mockRejectedValue(new Error('must not set default data view')),
    ...rest,
  } as unknown as DataViewsPublicPluginStart;
};

describe('resolveUxAppControlDataView', () => {
  it('reuses an existing data view with the OTel traces title', async () => {
    const dataViews = mockDataViews({
      fields: {
        'resource.attributes.service.name': field('resource.attributes.service.name'),
      },
      getIdsWithTitle: jest.fn().mockResolvedValue([{ id: 'existing', title: uxSearchIndex() }]),
    });

    await expect(resolveUxAppControlDataView(dataViews)).resolves.toEqual({
      id: 'dv-created',
      fieldName: 'resource.attributes.service.name',
    });
    expect(dataViews.get).toHaveBeenCalledWith('existing');
    expect(dataViews.create).not.toHaveBeenCalled();
    expect(dataViews.createAndSave).not.toHaveBeenCalled();
  });

  it('persists a new data view without calling createAndSave', async () => {
    const dataViews = mockDataViews({
      fields: {
        'resource.attributes.service.name': field('resource.attributes.service.name', false),
        'resource.attributes.service.name.keyword': field(
          'resource.attributes.service.name.keyword'
        ),
      },
    });

    await expect(resolveUxAppControlDataView(dataViews)).resolves.toEqual({
      id: 'dv-created',
      fieldName: 'resource.attributes.service.name.keyword',
    });
    expect(dataViews.create).toHaveBeenCalled();
    expect(dataViews.createSavedObject).toHaveBeenCalled();
    expect(dataViews.createAndSave).not.toHaveBeenCalled();
  });

  it('skips the control when data view creation fails', async () => {
    const dataViews = mockDataViews({
      create: jest.fn().mockRejectedValue(new Error('no save privilege')),
    });
    await expect(resolveUxAppControlDataView(dataViews)).resolves.toBeUndefined();
  });
});
