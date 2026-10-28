/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { createCoreStartMock, createStartDependenciesMock } from './mocks';
import { EntityInventoryAppPlugin } from './plugin';

describe('EntityInventoryAppPlugin setup', () => {
  it('registers the app on its own route with a deep link per entity page', () => {
    const coreSetup = coreMock.createSetup();
    new EntityInventoryAppPlugin().setup(coreSetup, {});

    const [[app]] = coreSetup.application.register.mock.calls;
    expect(app).toEqual(
      expect.objectContaining({ id: 'entityInventoryApp', appRoute: '/app/entity-inventory' })
    );
    expect(app.deepLinks?.map(({ id, path }) => ({ id, path }))).toEqual([
      { id: 'allResources', path: '/all-resources' },
      { id: 'hosts', path: '/hosts' },
      { id: 'kubernetes', path: '/kubernetes' },
    ]);
  });

  it('mounts the routed page shell with the start services', async () => {
    const plugins = createStartDependenciesMock();
    const coreSetup = coreMock.createSetup({ pluginStartDeps: plugins });
    coreSetup.getStartServices.mockResolvedValue([createCoreStartMock(), plugins, {}]);
    new EntityInventoryAppPlugin().setup(coreSetup, {});
    const [[{ mount }]] = coreSetup.application.register.mock.calls;
    const mountParams = coreMock.createAppMountParameters('/app/entity-inventory');
    mountParams.history.push('/hosts');

    let unmount: () => void = () => {};
    await act(async () => {
      unmount = await mount(mountParams);
    });

    expect(
      mountParams.element.querySelector('[data-test-subj="entityInventoryPageShell"]')
    ).toHaveAttribute('data-entity-category', 'hosts');
    expect(mountParams.element.querySelector('[data-test-subj="mockSearchBar"]')).not.toBeNull();

    act(() => unmount());
  });
});

describe('EntityInventoryAppPlugin start', () => {
  it('registers the entity pages in the classic nav and exposes them for the solution nav tree', () => {
    const plugins = createStartDependenciesMock();

    const { navTreeGroup } = new EntityInventoryAppPlugin().start(coreMock.createStart(), plugins);

    expect(plugins.observabilityShared.navigation.registerSections).toHaveBeenCalledTimes(1);
    expect(navTreeGroup.children?.map(({ link }) => link)).toEqual([
      'entityInventoryApp:allResources',
      'entityInventoryApp:hosts',
      'entityInventoryApp:kubernetes',
    ]);
  });
});
