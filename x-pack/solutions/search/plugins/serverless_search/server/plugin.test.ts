/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { ServerlessSearchPlugin } from './plugin';
import type { StartDependencies } from './types';

/** Minimal in-memory stand-in for the data views service default handling. */
const createFakeDataViews = (initialDefault: string | null, onCreate?: () => Promise<void>) => {
  const views = new Set<string>();
  let defaultIndex = initialDefault;
  const service = {
    get: jest.fn(async (id: string) => {
      if (!views.has(id)) throw new Error('not found');
    }),
    getDefault: jest.fn(async () =>
      defaultIndex && views.has(defaultIndex) ? defaultIndex : null
    ),
    defaultDataViewExists: jest.fn(async () => views.size > 0),
    createAndSave: jest.fn(async ({ id }: { id: string }) => {
      await onCreate?.();
      views.add(id);
      return { id };
    }),
    setDefault: jest.fn(async (id: string, force = false) => {
      if (force || !defaultIndex) defaultIndex = id;
    }),
  };
  return {
    getDefaultIndex: () => defaultIndex,
    addView: (id: string) => views.add(id),
    service,
    start: async () => {
      const plugin = new ServerlessSearchPlugin(coreMock.createPluginInitializerContext({}));
      plugin.start(coreMock.createStart(), {
        dataViews: {
          dataViewsServiceFactory: jest.fn().mockResolvedValue(service),
        } as unknown as DataViewsServerPluginStart,
      } as unknown as StartDependencies);
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
};

describe('ServerlessSearchPlugin default data view bootstrap', () => {
  it('sets the created data view as default when none is configured', async () => {
    const fake = createFakeDataViews(null);
    await fake.start();
    expect(fake.getDefaultIndex()).toBe('default_all_data_id');
  });

  it('replaces a stale defaultIndex', async () => {
    const fake = createFakeDataViews('deleted-id');
    await fake.start();
    expect(fake.getDefaultIndex()).toBe('default_all_data_id');
  });

  it('keeps a valid default configured while createAndSave is pending', async () => {
    const fake = createFakeDataViews(null, async () => {
      fake.addView('other-id');
      await fake.service.setDefault('other-id');
    });
    await fake.start();
    expect(fake.getDefaultIndex()).toBe('other-id');
  });
});
