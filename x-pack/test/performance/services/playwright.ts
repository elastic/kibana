/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import Url from 'url';
import { inspect } from 'util';
import apm, { Outcome, Span, Transaction } from 'elastic-apm-node';
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

export class PlaywrightService extends FtrService {
  private readonly config = this.ctx.getService('config');
  // private readonly es = this.ctx.getService('es');
  private readonly lifecycle = this.ctx.getService('lifecycle');
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

  private startTransaction(name: string) {
    if (this.currentTransaction !== undefined) {
      throw new Error(
        `Transaction already started, make sure you end transaction ${this.currentTransaction?.name}`
      );
    }
    this.currentTransaction = apm.startTransaction(name, 'performance');
  }

  private endTransaction(result: string) {
    if (this.currentTransaction === undefined) {
      throw new Error(`No transaction started`);
    }
    this.currentTransaction?.end(result);
    this.currentTransaction = undefined;
  }

  private async withTransaction<T>(name: string, block: () => Promise<T>) {
    try {
      this.startTransaction(name);
      const result = await block();
      this.endTransaction('success');
      return result;
    } catch (e) {
      this.endTransaction('failure');
      throw e;
    }
  }

  private startSpan(name: string, type?: string) {
    this.currentSpanStack.unshift(apm.startSpan(name, type ?? null));
  }

  private endSpan(outcome: Outcome) {
    if (this.currentSpanStack.length === 0) {
      throw new Error(`No Span started`);
    }
    const span = this.currentSpanStack.shift();
    span?.setOutcome(outcome);
    span?.end();
  }

  private async withSpan<T>(name: string, type: string | undefined, block: () => Promise<T>) {
    try {
      this.startSpan(name, type);
      const result = await block();
      this.endSpan('success');
      return result;
    } catch (e) {
      this.endSpan('failure');
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

      const noDelayOnUserActions = process.env.TEST_DONT_DELAY_USER_ACTIONS === 'true';

      await usernameLocator?.type('elastic', { delay: noDelayOnUserActions ? 0 : 500 });
      await passwordLocator?.type('changeme', { delay: noDelayOnUserActions ? 0 : 500 });
      await submitButtonLocator?.click({ delay: noDelayOnUserActions ? 0 : 1000 });

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
      this.browser = await playwright.chromium.launch({ headless });
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

  public makePage({ journeyName, autoLogin }: { journeyName: string; autoLogin?: boolean }) {
    const steps: Steps = [];

    it(journeyName, async () => {
      await this.withTransaction(`Journey ${journeyName}`, async () => {
        const browser = await this.getBrowserInstance();
        const context = await browser.newContext({
          ...(autoLogin && { storageState: await this.getStorageState() }),
          viewport: { width: 1600, height: 1200 },
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
