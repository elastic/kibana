/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { registerRoutes } from '@kbn/server-route-repository';
import { NightshiftSourcesPlugin } from './plugin';
import { NIGHTSHIFT_SOURCE_SO_TYPE } from './saved_objects/nightshift_source_saved_object';
import type { GetSourcesClient } from './types';

jest.mock('@kbn/server-route-repository', () => ({
  ...jest.requireActual('@kbn/server-route-repository'),
  registerRoutes: jest.fn(),
}));

const SOURCE_ID = 'source-1';

const createSetup = () => {
  const plugin = new NightshiftSourcesPlugin(coreMock.createPluginInitializerContext());
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

  const soClient = savedObjectsClientMock.create();
  soClient.get.mockResolvedValue({
    id: SOURCE_ID,
    type: NIGHTSHIFT_SOURCE_SO_TYPE,
    references: [],
    version: 'WzEsMV0=',
    attributes: {
      title: 'nginx errors',
      tags: [],
      esql: 'FROM logs-nginx-*',
      slug: 'nginx-errors',
      view_name: '$.nightshift.sources.default.nginx-errors',
      enabled: true,
      created_by: 'marco',
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
      esql_updated_at: '2026-09-01T00:00:00.000Z',
    },
  });
  soClient.update.mockResolvedValue({
    id: SOURCE_ID,
    type: NIGHTSHIFT_SOURCE_SO_TYPE,
    references: [],
    attributes: {},
  });
  coreStart.savedObjects.getScopedClient.mockReturnValue(soClient);

  const setup = plugin.setup(coreSetup);
  const [{ dependencies }] = jest.mocked(registerRoutes).mock.calls[0] as unknown as [
    { dependencies: { getSourcesClient: GetSourcesClient } }
  ];
  return { plugin, coreStart, setup, routeGetSourcesClient: dependencies.getSourcesClient };
};

describe('NightshiftSourcesPlugin source change events', () => {
  beforeEach(() => {
    jest.mocked(registerRoutes).mockClear();
  });

  it('delivers a write made by the HTTP route client to setup listeners with its request', async () => {
    const { setup, routeGetSourcesClient } = createSetup();
    const listener = jest.fn().mockResolvedValue(undefined);
    setup.onSourceChange(listener);
    const request = httpServerMock.createKibanaRequest();

    await (await routeGetSourcesClient({ request })).setEnabled(SOURCE_ID, false);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'updated',
        request,
        source: expect.objectContaining({ id: SOURCE_ID, enabled: false }),
        previous: expect.objectContaining({ id: SOURCE_ID, enabled: true }),
      })
    );
  });

  it('delivers a write made by the start contract client to setup listeners with its request', async () => {
    const { plugin, coreStart, setup } = createSetup();
    const listener = jest.fn().mockResolvedValue(undefined);
    setup.onSourceChange(listener);
    const request = httpServerMock.createKibanaRequest();

    const start = plugin.start(coreStart, {});
    await (await start.getSourcesClient({ request })).setEnabled(SOURCE_ID, false);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'updated', request }));
  });

  it('stops delivering events after the listener unsubscribes', async () => {
    const { setup, routeGetSourcesClient } = createSetup();
    const listener = jest.fn().mockResolvedValue(undefined);
    const unsubscribe = setup.onSourceChange(listener);
    unsubscribe();

    await (
      await routeGetSourcesClient({ request: httpServerMock.createKibanaRequest() })
    ).setEnabled(SOURCE_ID, false);

    expect(listener).not.toHaveBeenCalled();
  });
});
