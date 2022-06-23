/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import Url from 'url';
import { inspect } from 'util';
import { setTimeout } from 'timers/promises';
import apm, { Span, Transaction } from 'elastic-apm-node';
import playwright, { ChromiumBrowser, Page, BrowserContext, CDPSession } from 'playwright';
import { FtrService, FtrProviderContext } from '../ftr_provider_context';

export interface StepCtx {
  page: Page;
  kibanaUrl: string;
}

type StepFn = (ctx: StepCtx) => Promise<void>;
export type Steps = Array<{ name: string; handler: StepFn }>;

export class PerformanceTestingService extends FtrService {
  private readonly auth = this.ctx.getService('auth');
  private readonly config = this.ctx.getService('config');

  private browser: ChromiumBrowser | undefined;
  private currentSpanStack: Array<Span | null> = [];
  private currentTransaction: Transaction | undefined | null = undefined;

  constructor(ctx: FtrProviderContext) {
    super(ctx);

    ctx.getService('lifecycle').beforeTests.add(() => {
      apm.start({
        serviceName: 'functional test runner',
        environment: process.env.CI ? 'ci' : 'development',
        active: this.config.get(`kbnTestServer.env`).ELASTIC_APM_ACTIVE !== 'false',
        serverUrl: this.config.get(`kbnTestServer.env`).ELASTIC_APM_SERVER_URL,
        secretToken: this.config.get(`kbnTestServer.env`).ELASTIC_APM_SECRET_TOKEN,
        globalLabels: this.config.get(`kbnTestServer.env`).ELASTIC_APM_GLOBAL_LABELS,
        transactionSampleRate:
          this.config.get(`kbnTestServer.env`).ELASTIC_APM_TRANSACTION_SAMPLE_RATE,
        logger: process.env.VERBOSE_APM_LOGGING
          ? {
              warn(...args: any[]) {
                console.log('APM WARN', ...args);
              },
              info(...args: any[]) {
                console.log('APM INFO', ...args);
              },
              fatal(...args: any[]) {
                console.log('APM FATAL', ...args);
              },
              error(...args: any[]) {
                console.log('APM ERROR', ...args);
              },
              debug(...args: any[]) {
                console.log('APM DEBUG', ...args);
              },
              trace(...args: any[]) {
                console.log('APM TRACE', ...args);
              },
            }
          : undefined,
      });
    });

    ctx.getService('lifecycle').cleanup.add(async () => {
      await this.shutdownBrowser();
      await new Promise<void>((resolve) => apm.flush(() => resolve()));
      // wait for the HTTP request that apm.flush() starts, which we
      // can't track but hope is complete within 3 seconds
      // https://github.com/elastic/apm-agent-nodejs/issues/2088
      await setTimeout(3000);
    });
  }

  private getKibanaUrl() {
    return Url.format({
      protocol: this.config.get('servers.kibana.protocol'),
      hostname: this.config.get('servers.kibana.hostname'),
      port: this.config.get('servers.kibana.port'),
    });
  }

  private async withTransaction<T>(name: string, block: () => Promise<T>) {
    try {
      if (this.currentTransaction) {
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

  public runUserJourney(
    journeyName: string,
    steps: Steps,
    { requireAuth }: { requireAuth: boolean }
  ) {
    return this.withTransaction(`Journey ${journeyName}`, async () => {
      const browser = await this.getBrowserInstance();
      const viewport = { width: 1600, height: 1200 };
      const context = await browser.newContext({ viewport });

      if (!requireAuth) {
        const cookie = await this.auth.login({ username: 'elastic', password: 'changeme' });
        await context.addCookies([cookie]);
      }

      const page = await context.newPage();
      if (!process.env.NO_BROWSER_LOG) {
        page.on('console', this.onConsoleEvent());
      }
      const client = await this.sendCDPCommands(context, page);

      await this.interceptBrowserRequests(page);
      await this.handleSteps(steps, page);
      await this.tearDown(page, client, context);
    });
  }

  private async tearDown(page: Page, client: CDPSession, context: BrowserContext) {
    if (page) {
      await client.detach();
      await page.close();
      await context.close();
    }
  }

  private async shutdownBrowser() {
    if (this.browser) {
      await (await this.getBrowserInstance()).close();
    }
  }

  private async handleSteps(steps: Array<{ name: string; handler: StepFn }>, page: Page) {
    for (const step of steps) {
      await this.withSpan(`step: ${step.name}`, 'step', async () => {
        try {
          await step.handler({ page, kibanaUrl: this.getKibanaUrl() });
        } catch (e) {
          const error = new Error(`Step [${step.name}] failed: ${e.message}`);
          error.stack = e.stack;
        }
      });
    }
  }

  private onConsoleEvent() {
    return async (message: playwright.ConsoleMessage) => {
      try {
        const args = await Promise.all(message.args().map(async (handle) => handle.jsonValue()));

        const { url, lineNumber, columnNumber } = message.location();

        const location = `${url},${lineNumber},${columnNumber}`;

        const text = args.length
          ? args.map((arg) => (typeof arg === 'string' ? arg : inspect(arg, false, null))).join(' ')
          : message.text();

        console.log(`[console.${message.type()}]`, text);
        console.log('    ', location);
      } catch (e) {
        console.error('Failed to evaluate console.log line', e);
      }
    };
  }
}
