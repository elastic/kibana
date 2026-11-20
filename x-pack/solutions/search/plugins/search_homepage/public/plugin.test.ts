/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { App } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { SearchHomepagePlugin } from './plugin';

describe('SearchHomepagePlugin', () => {
  const elasticsearchHome = { HomePage: () => null };
  const share = sharePluginMock.createStartContract();
  const webCrawler = { WebCrawlPanel: () => null, WebCrawlsPage: () => null };

  const setupPlugin = () => {
    const coreSetup = coreMock.createSetup();
    const plugin = new SearchHomepagePlugin();
    plugin.setup(coreSetup);
    const [[app]] = coreSetup.application.register.mock.calls;

    return { plugin, app };
  };

  const getDeepLinks = async ({ updater$, ...app }: App) => {
    if (!updater$) {
      throw new Error('The app registered no updater');
    }
    const update = await firstValueFrom(updater$);
    return update(app)?.deepLinks;
  };

  it('links to the web crawls page when the web crawler plugin is available', async () => {
    const { plugin, app } = setupPlugin();

    plugin.start(coreMock.createStart(), { elasticsearchHome, share, webCrawler });

    expect(await getDeepLinks(app)).toEqual([
      expect.objectContaining({ id: 'analytics' }),
      expect.objectContaining({ id: 'webCrawls', path: '/web_crawls', title: 'Web crawls' }),
    ]);
  });

  it('registers no web crawls link without the web crawler plugin', async () => {
    const { plugin, app } = setupPlugin();

    plugin.start(coreMock.createStart(), { elasticsearchHome, share });

    expect(await getDeepLinks(app)).toBeUndefined();
    expect(app.deepLinks).toEqual([expect.objectContaining({ id: 'analytics' })]);
  });

  describe('chrome', () => {
    const getHideChrome = async ({ updater$, ...app }: App) => {
      if (!updater$) {
        throw new Error('The app registered no updater');
      }
      const update = await firstValueFrom(updater$);
      return update(app)?.hideChrome;
    };

    afterEach(() => localStorage.clear());

    it('is hidden from the first render in a browser that has not seen data here', async () => {
      const { app } = setupPlugin();

      expect(await getHideChrome(app)).toBe(true);
    });

    it('is shown from the first render in a browser that has seen data here', async () => {
      localStorage.setItem('searchHomepage.hasData', 'true');
      const { app } = setupPlugin();

      expect(await getHideChrome(app)).toBe(false);
    });

    it('stays hidden when the web crawls link is added', async () => {
      const { plugin, app } = setupPlugin();

      plugin.start(coreMock.createStart(), { elasticsearchHome, share, webCrawler });

      expect(await getHideChrome(app)).toBe(true);
    });
  });
});
