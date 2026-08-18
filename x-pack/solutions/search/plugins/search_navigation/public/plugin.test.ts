/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { SearchNavigationPlugin } from './plugin';

describe('SearchNavigationPlugin', () => {
  const createContextEngineSetup = () => ({
    registerAppChromeAdapter: jest.fn(),
  });

  const createPlugin = () => new SearchNavigationPlugin(coreMock.createPluginInitializerContext());

  const createCoreStart = () => {
    const coreStart = coreMock.createStart();
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      index_management: {
        monitor: false,
        manageEnrich: false,
        monitorEnrich: false,
        manageIndexTemplates: false,
      },
    };
    return coreStart;
  };

  it('registers a context engine chrome adapter on start', () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = createCoreStart();
    const contextEngineSetup = createContextEngineSetup();
    const plugin = createPlugin();

    plugin.setup(coreSetup, {
      share: sharePluginMock.createSetupContract(),
      contextEngine: contextEngineSetup,
    });
    plugin.start(coreStart, {
      share: sharePluginMock.createStartContract(),
    });

    expect(contextEngineSetup.registerAppChromeAdapter).toHaveBeenCalledTimes(1);

    const adapter = contextEngineSetup.registerAppChromeAdapter.mock.calls[0][0];

    expect(adapter).toEqual(
      expect.objectContaining({
        handleOnAppMount: expect.any(Function),
        getClassicNavigation: expect.any(Function),
        breadcrumbs: {
          setAppBreadcrumbs: expect.any(Function),
          clearBreadcrumbs: expect.any(Function),
        },
      })
    );
  });

  it('forwards context engine breadcrumbs through search navigation', () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = createCoreStart();
    const contextEngineSetup = createContextEngineSetup();
    const plugin = createPlugin();

    coreStart.chrome.getChromeStyle$.mockReturnValue(new BehaviorSubject('classic'));

    plugin.setup(coreSetup, {
      share: sharePluginMock.createSetupContract(),
      contextEngine: contextEngineSetup,
    });
    plugin.start(coreStart, {
      share: sharePluginMock.createStartContract(),
    });

    const adapter = contextEngineSetup.registerAppChromeAdapter.mock.calls[0][0];

    adapter.breadcrumbs.setAppBreadcrumbs([{ text: 'Context' }]);

    expect(coreStart.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      expect.objectContaining({ text: 'Elasticsearch' }),
      { text: 'Context' },
    ]);
  });

  it('does not expose classic navigation through the adapter in project chrome', () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = createCoreStart();
    const contextEngineSetup = createContextEngineSetup();
    const plugin = createPlugin();
    const history = scopedHistoryMock.create();

    coreStart.chrome.getChromeStyle$.mockReturnValue(new BehaviorSubject('project'));

    plugin.setup(coreSetup, {
      share: sharePluginMock.createSetupContract(),
      contextEngine: contextEngineSetup,
    });
    plugin.start(coreStart, {
      share: sharePluginMock.createStartContract(),
    });

    const adapter = contextEngineSetup.registerAppChromeAdapter.mock.calls[0][0];

    expect(adapter.getClassicNavigation(history)).toBeUndefined();
  });
});
