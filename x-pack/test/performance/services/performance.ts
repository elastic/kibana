/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import Url from 'url';
import { inspect } from 'util';
import apm, { Span, Transaction } from 'elastic-apm-node';
import { setTimeout } from 'timers/promises';
import playwright, { ChromiumBrowser, Page, BrowserContext } from 'playwright';
import { FtrService, FtrProviderContext } from '../ftr_provider_context';

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

apm.start({
  secretToken: 'Q5q5rWQEw6tKeirBpw',
  serverUrl: 'https://2fad4006bf784bb8a54e52f4a5862609.apm.us-west1.gcp.cloud.es.io:443',
  serviceName: 'functional test runner',
});

interface StepCtx {
  page: Page;
}
type StepFn = (ctx: StepCtx) => Promise<void>;
type Steps = Array<{ name: string; fn: StepFn }>;

export class PerformanceTestingService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly lifecycle = this.ctx.getService('lifecycle');
  private readonly inputDelays = this.ctx.getService('inputDelays');
  private browser: ChromiumBrowser | undefined;
  private storageState: StorageState | undefined;
  private currentSpanStack: Array<Span | null> = [];
  private currentTransaction: Transaction | undefined | null;

  constructor(ctx: FtrProviderContext) {
    super(ctx);

    this.lifecycle.beforeTests.add(async () => {
      await this.withTransaction('Journey setup', async () => {
        await this.getStorageState();
      });
    });

    this.lifecycle.cleanup.add(async () => {
      apm.flush();
      await setTimeout(5000);
      await this.browser?.close();
    });
  }

  private async withTransaction<T>(name: string, block: () => Promise<T>) {
    try {
      if (this.currentTransaction !== undefined) {
        throw new Error(
          `Transaction already started, make sure you end transaction ${this.currentTransaction?.name}`
        );
      }
      this.currentTransaction = apm.startTransaction(name, 'performance');
      const result = await block();
      if (this.currentTransaction === undefined) {
        throw new Error(`No transaction started`);
      }
      this.currentTransaction?.end('success');
      this.currentTransaction = undefined;
      return result;
    } catch (e) {
      if (this.currentTransaction === undefined) {
        throw new Error(`No transaction started`);
      }
      this.currentTransaction?.end('failure');
      this.currentTransaction = undefined;
      throw e;
    }
  }

  private async withSpan<T>(name: string, type: string | undefined, block: () => Promise<T>) {
    try {
      this.currentSpanStack.unshift(apm.startSpan(name, type ?? null));
      const result = await block();
      if (this.currentSpanStack.length === 0) {
        throw new Error(`No Span started`);
      }
      const span = this.currentSpanStack.shift();
      span?.setOutcome('success');
      span?.end();
      return result;
    } catch (e) {
      if (this.currentSpanStack.length === 0) {
        throw new Error(`No Span started`);
      }
      const span = this.currentSpanStack.shift();
      span?.setOutcome('failure');
      span?.end();
      throw e;
    }
  }

  private getCurrentTraceparent() {
    return (this.currentSpanStack.length ? this.currentSpanStack[0] : this.currentTransaction)
      ?.traceparent;
  }

  private async getStorageState() {
    if (this.storageState) {
      return this.storageState;
    }

    await this.withSpan('initial login', undefined, async () => {
      const kibanaUrl = Url.format({
        protocol: this.config.get('servers.kibana.protocol'),
        hostname: this.config.get('servers.kibana.hostname'),
        port: this.config.get('servers.kibana.port'),
      });

      const browser = await this.getBrowserInstance();
      const context = await browser.newContext();
      const page = await context.newPage();
      await this.interceptBrowserRequests(page);
      await page.goto(`${kibanaUrl}`);

      const usernameLocator = page.locator('[data-test-subj=loginUsername]');
      const passwordLocator = page.locator('[data-test-subj=loginPassword]');
      const submitButtonLocator = page.locator('[data-test-subj=loginSubmit]');

      await usernameLocator?.type('elastic', { delay: this.inputDelays.TYPING });
      await passwordLocator?.type('changeme', { delay: this.inputDelays.TYPING });
      await submitButtonLocator?.click({ delay: this.inputDelays.MOUSE_CLICK });

      await page.waitForSelector('#headerUserMenu');

      this.storageState = await page.context().storageState();
      await page.close();
      await context.close();
    });

    return this.storageState;
  }

  private async getBrowserInstance() {
    if (this.browser) {
      return this.browser;
    }
    return await this.withSpan('browser creation', 'setup', async () => {
      const headless = !!(process.env.TEST_BROWSER_HEADLESS || process.env.CI);
      this.browser = await playwright.chromium.launch({ headless, timeout: 60000 });
      return this.browser;
    });
  }

  private async sendCDPCommands(context: BrowserContext, page: Page) {
    const client = await context.newCDPSession(page);

    await client.send('Network.clearBrowserCache');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Network.emulateNetworkConditions', {
      latency: 100,
      downloadThroughput: 750_000,
      uploadThroughput: 750_000,
      offline: false,
    });

    return client;
  }

  private async interceptBrowserRequests(page: Page) {
    await page.route('**', async (route, request) => {
      const headers = await request.allHeaders();
      const traceparent = this.getCurrentTraceparent();
      if (traceparent && request.isNavigationRequest()) {
        await route.continue({ headers: { traceparent, ...headers } });
      } else {
        await route.continue();
      }
    });
  }

  public makePage(journeyName: string) {
    const steps: Steps = [];

    it(journeyName, async () => {
      await this.withTransaction(`Journey ${journeyName}`, async () => {
        const browser = await this.getBrowserInstance();
        const context = await browser.newContext({
          viewport: { width: 1600, height: 1200 },
          storageState: await this.getStorageState(),
        });

        const page = await context.newPage();
        page.on('console', (message) => {
          (async () => {
            try {
              const args = await Promise.all(
                message.args().map(async (handle) => handle.jsonValue())
              );

              const { url, lineNumber, columnNumber } = message.location();

              const location = `${url},${lineNumber},${columnNumber}`;

              const text = args.length
                ? args.map((arg) => (typeof arg === 'string' ? arg : inspect(arg))).join(' ')
                : message.text();

              console.log(`[console.${message.type()}]`, text);
              console.log('    ', location);
            } catch (e) {
              console.error('Failed to evaluate console.log line', e);
            }
          })();
        });
        const client = await this.sendCDPCommands(context, page);

        await this.interceptBrowserRequests(page);

        try {
          for (const step of steps) {
            await this.withSpan(`step: ${step.name}`, 'step', async () => {
              try {
                await step.fn({ page });
              } catch (e) {
                const error = new Error(`Step [${step.name}] failed: ${e.message}`);
                error.stack = e.stack;
                throw error;
              }
            });
          }
        } finally {
          if (page) {
            await client.detach();
            await page.close();
            await context.close();
          }
        }
      });
    });

    return {
      step: (name: string, fn: StepFn) => {
        steps.push({ name, fn });
      },
    };
  }
}
