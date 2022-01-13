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
  private browser!: ChromiumBrowser;
  private context!: BrowserContext;
  private page!: Page;
  private storageState: StorageState | undefined;

  private async populateStorageState() {
    const kibanaUrl = Url.format({
      protocol: this.config.get('servers.kibana.protocol'),
      hostname: this.config.get('servers.kibana.hostname'),
      port: this.config.get('servers.kibana.port'),
    });

    await this.page.goto(`${kibanaUrl}`);
    const usernameLocator = this.page.locator('[data-test-subj=loginUsername]');
    const passwordLocator = this.page.locator('[data-test-subj=loginPassword]');
    const submitButtonLocator = this.page.locator('[data-test-subj=loginSubmit]');

    await usernameLocator?.type('elastic', { delay: 500 });
    await passwordLocator?.type('changeme', { delay: 500 });
    await submitButtonLocator?.click({ delay: 1000 });

    await this.page.waitForSelector('#headerUserMenu');

    this.storageState = await this.page?.context().storageState();
  }

  private async getBrowserInstance() {
    if (this.browser) {
      this.browser = await playwright.chromium.launch({ headless: true });
    }
    return this.browser;
  }

  public makePage(useStorageState: boolean = false) {
    const browser$ = new Rx.Subject<ChromiumBrowser>();
    const browser = createAsyncInstance('service', 'browser', firstValueFrom(browser$));
    const page$ = new Rx.Subject<Page>();
    const page = createAsyncInstance('service', 'page', firstValueFrom(page$));

    before(async () => {
      const actualBrowser = await this.getBrowserInstance();
      browser$.next(actualBrowser);

      if (!this.storageState && useStorageState) {
        await this.populateStorageState();
      }

      this.context = await actualBrowser.newContext({
        ...(useStorageState && { storageState: this.storageState }),
      });

      this.page = await this.context.newPage();
      page$.next(this.page);

      const client = await this.context.newCDPSession(this.page);

      await client.send('Network.clearBrowserCache');
      await client.send('Network.setCacheDisabled', { cacheDisabled: true });
      await client.send('Network.emulateNetworkConditions', {
        latency: 100,
        downloadThroughput: 750_000,
        uploadThroughput: 750_000,
        offline: false,
      });

      await this.page.route('**', (route) => {
        if (route.request().url().includes('rum')) {
          // console.log(
          //   '------REQUEST------' +
          //     JSON.stringify(
          //       {
          //         headers: route.request().headers(),
          //         routeUrl: route.request().url(),
          //         data: route.request().postData(),
          //       },
          //       null,
          //       4
          //     )
          // );
        }
        return route.continue();
      });
    });

    after(async () => {
      await this.browser.close();
    });

    return {
      browser,
      page,
    };
  }
}
