/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { SearchGettingStartedPlugin } from './plugin';

describe('SearchGettingStartedPlugin', () => {
  const setupPlugin = () => {
    const coreSetup = coreMock.createSetup();
    new SearchGettingStartedPlugin(coreMock.createPluginInitializerContext()).setup(coreSetup, {});
    const [[app]] = coreSetup.application.register.mock.calls;

    return { app };
  };

  it('keeps its URL but is listed in no navigation or global search', () => {
    const { app } = setupPlugin();

    expect(app).toMatchObject({
      id: 'searchGettingStarted',
      appRoute: '/app/elasticsearch/getting_started',
      visibleIn: [],
    });
  });

  it('hides the chrome in a browser that has not seen data in the deployment', async () => {
    const { app } = setupPlugin();
    const { updater$, ...rest } = app;
    if (!updater$) {
      throw new Error('The app registered no updater');
    }

    expect((await firstValueFrom(updater$))(rest)?.hideChrome).toBe(true);

    localStorage.setItem('searchHomepage.hasData', 'true');
    const { app: nextApp } = setupPlugin();
    const { updater$: nextUpdater$, ...nextRest } = nextApp;
    if (!nextUpdater$) {
      throw new Error('The app registered no updater');
    }

    expect((await firstValueFrom(nextUpdater$))(nextRest)?.hideChrome).toBe(false);
    localStorage.clear();
  });
});
