/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import playwright, { ChromiumBrowser, Page, BrowserContext } from 'playwright';
import { firstValueFrom } from '@kbn/std';
import { createAsyncInstance } from '@kbn/test';
import Url from 'url';
import { FtrService } from '../ftr_provider_context';

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

export class PlaywrightService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly es = this.ctx.getService('es');
  private browser: ChromiumBrowser | undefined;
  private storageState: StorageState | undefined;

  private async getStorageState() {
    if (this.storageState) {
      return this.storageState;
    }

    const kibanaUrl = Url.format({
      protocol: this.config.get('servers.kibana.protocol'),
      hostname: this.config.get('servers.kibana.hostname'),
      port: this.config.get('servers.kibana.port'),
    });

    const browser = await this.getBrowserInstance();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${kibanaUrl}`);

    const usernameLocator = page.locator('[data-test-subj=loginUsername]');
    const passwordLocator = page.locator('[data-test-subj=loginPassword]');
    const submitButtonLocator = page.locator('[data-test-subj=loginSubmit]');

    const noDelayOnUserActions = process.env.TEST_DONT_DELAY_USER_ACTIONS === 'true';

    await usernameLocator?.type('elastic', { delay: noDelayOnUserActions ? 0 : 500 });
    await passwordLocator?.type('changeme', { delay: noDelayOnUserActions ? 0 : 500 });
    await submitButtonLocator?.click({ delay: noDelayOnUserActions ? 0 : 1000 });

    await page.waitForSelector('#headerUserMenu');

    this.storageState = await page.context().storageState();
    await page.close();

    return this.storageState;
  }

  private async getBrowserInstance() {
    if (!this.browser) {
      const headless = !!(process.env.TEST_BROWSER_HEADLESS || process.env.CI);
      this.browser = await playwright.chromium.launch({ headless });
    }
    return this.browser;
  }

  public makePage(options: { autoLogin?: boolean; journeyName: string } = { journeyName: '' }) {
    const browser$ = new Rx.Subject<ChromiumBrowser>();
    const page$ = new Rx.Subject<Page>();
    let pageToCleanup: Page | undefined;

    before(async () => {
      const browser = await this.getBrowserInstance();
      const context = await browser.newContext({
        ...(options.autoLogin && { storageState: await this.getStorageState() }),
        viewport: { width: 1600, height: 1200 },
        extraHTTPHeaders: { journeyName: options.journeyName },
      });

      const page = await context.newPage();
      pageToCleanup = page;
      const client = await context.newCDPSession(page);

      await client.send('Network.clearBrowserCache');
      await client.send('Network.setCacheDisabled', { cacheDisabled: true });
      await client.send('Network.emulateNetworkConditions', {
        latency: 100,
        downloadThroughput: 750_000,
        uploadThroughput: 750_000,
        offline: false,
      });

      await page.route('**', (route) => route.continue());

      browser$.next(browser);
      page$.next(page);
    });

    after(async () => {
      if (pageToCleanup) {
        await pageToCleanup.close();
        await this.es.updateByQuery({
          index: '.apm-*',
          refresh: true,
          body: { query: { match_all: {} } },
        });
      }
    });

    return {
      browser: createAsyncInstance('service', 'browser', firstValueFrom(browser$)),
      page: createAsyncInstance('service', 'page', firstValueFrom(page$)),
    };
  }
}
