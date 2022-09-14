/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';
import * as Rx from 'rxjs';
import { inspect } from 'util';
import { setTimeout } from 'timers/promises';
import apmNode from 'elastic-apm-node';
import playwright, { ChromiumBrowser, Page, BrowserContext, CDPSession, Request } from 'playwright';
import { FtrService, FtrProviderContext } from '../ftr_provider_context';

export interface StepCtx {
  page: Page;
  kibanaUrl: string;
}

type StepFn = (ctx: StepCtx) => Promise<void>;
export type Steps = Array<{ name: string; handler: StepFn }>;

interface UserJourneyExtra {
  requireAuth: boolean;
}

export class PerformanceTestingService extends FtrService {
  private readonly auth = this.ctx.getService('auth');
  private readonly log = this.ctx.getService('log');
  private readonly config = this.ctx.getService('config');

  private browser: ChromiumBrowser | undefined;
  private page: Page | undefined;
  private client: CDPSession | undefined;
  private context: BrowserContext | undefined;
  private currentSpanStack: Array<apmNode.Span | null> = [];
  private currentTransaction: apmNode.Transaction | undefined | null = undefined;

  private pageTeardown$ = new Rx.Subject<Page>();
  private telemetryTrackerSubs = new Map<Page, Rx.Subscription>();

  private apm: apmNode.Agent | null = null;
  private authRequired: boolean = false;

  constructor(ctx: FtrProviderContext) {
    super(ctx);

    ctx.getService('lifecycle').beforeTestSuite.add(this.beforeAll.bind(this));
    ctx.getService('lifecycle').afterTestSuite.add(this.afterAll.bind(this));
    ctx.getService('lifecycle').testFailure.add(this.onStepError.bind(this));
  }

  private async beforeAll() {
    const kbnTestServerEnv = this.config.get(`kbnTestServer.env`);

    this.apm = apmNode.start({
      serviceName: 'functional test runner',
      environment: process.env.CI ? 'ci' : 'development',
      active: kbnTestServerEnv.ELASTIC_APM_ACTIVE !== 'false',
      serverUrl: kbnTestServerEnv.ELASTIC_APM_SERVER_URL,
      secretToken: kbnTestServerEnv.ELASTIC_APM_SECRET_TOKEN,
      globalLabels: kbnTestServerEnv.ELASTIC_APM_GLOBAL_LABELS,
      transactionSampleRate: kbnTestServerEnv.ELASTIC_APM_TRANSACTION_SAMPLE_RATE,
    });

    if (this.currentTransaction) {
      throw new Error(`Transaction exist, end prev transaction ${this.currentTransaction?.name}`);
    }

    // this.config.get('journeyName');
    this.currentTransaction = this.apm?.startTransaction(`Journey xd`, 'performance');

    const browser = await this.getBrowserInstance();
    this.context = await browser.newContext({ bypassCSP: true });

    if (!this.authRequired) {
      const cookie = await this.auth.login({ username: 'elastic', password: 'changeme' });
      await this.context.addCookies([cookie]);
    }

    this.page = await this.context.newPage();

    if (!process.env.NO_BROWSER_LOG) {
      this.page.on('console', this.onConsoleEvent());
    }

    await this.sendCDPCommands(this.context, this.page);

    this.trackTelemetryRequests(this.page);
    await this.interceptBrowserRequests(this.page);
  }

  private async afterAll() {
    await this.tearDown();
    await this.shutdownBrowser();

    this.currentTransaction?.end('Success');
    this.currentTransaction = undefined;

    // @ts-ignore
    if (this.apm?.isStarted() && this.apm._conf.active) {
      this.log.info('Apm flushes');
      await new Promise<void>((resolve) => this.apm?.flush(() => resolve()));
      // wait for the HTTP request that apm.flush() starts, which we
      // can't track but hope is complete within 3 seconds
      // https://github.com/elastic/apm-agent-nodejs/issues/2088
      await setTimeout(3000);
    }
  }

  private async onStepError(err: Error) {
    this.currentTransaction?.end(`Failure ${err.message}`);
    this.currentTransaction = undefined;
  }

  private getKibanaUrl() {
    return Url.format({
      protocol: this.config.get('servers.kibana.protocol'),
      hostname: this.config.get('servers.kibana.hostname'),
      port: this.config.get('servers.kibana.port'),
    });
  }

  private async withSpan<T>(name: string, type: string | undefined, block: () => Promise<T>) {
    try {
      this.currentSpanStack.unshift(this.apm?.startSpan(name, type ?? null)!);
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
    return await this.withSpan('Browser creation', 'setup', async () => {
      const headless = !!(process.env.TEST_BROWSER_HEADLESS || process.env.CI);
      this.browser = await playwright.chromium.launch({ headless, timeout: 60_000 });
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

  private telemetryTrackerCount = 0;

  private trackTelemetryRequests(page: Page) {
    const id = ++this.telemetryTrackerCount;

    const requestFailure$ = Rx.fromEvent<Request>(page, 'requestfailed');
    const requestSuccess$ = Rx.fromEvent<Request>(page, 'requestfinished');
    const request$ = Rx.fromEvent<Request>(page, 'request').pipe(
      Rx.takeUntil(
        this.pageTeardown$.pipe(
          Rx.first((p) => p === page),
          Rx.delay(3000)
          // If EBT client buffers:
          // Rx.mergeMap(async () => {
          //  await page.waitForFunction(() => {
          //    // return window.kibana_ebt_client.buffer_size == 0
          //  });
          // })
        )
      ),
      Rx.mergeMap((request) => {
        if (!request.url().includes('telemetry-staging.elastic.co')) {
          return Rx.EMPTY;
        }

        this.log.debug(`Waiting for telemetry request #${id} to complete`);
        return Rx.merge(requestFailure$, requestSuccess$).pipe(
          Rx.first((r) => r === request),
          Rx.tap({
            complete: () => this.log.debug(`Telemetry request #${id} complete`),
          })
        );
      })
    );

    this.telemetryTrackerSubs.set(page, request$.subscribe());
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

  public runUserJourney(steps: Steps, { requireAuth }: UserJourneyExtra) {
    const journeyName = 'xd'; // this.config.get('journeyName');
    this.authRequired = requireAuth;
    describe(journeyName, () => this.handleSteps(steps));
  }

  private async tearDown() {
    if (this.page) {
      const telemetryTracker = this.telemetryTrackerSubs.get(this.page);
      this.telemetryTrackerSubs.delete(this.page);

      if (telemetryTracker && !telemetryTracker.closed) {
        this.log.info(`Waiting for telemetry requests, including starting within next 3 secs`);
        this.pageTeardown$.next(this.page);
        await new Promise<void>((resolve) => telemetryTracker.add(resolve));
      }
      await this.client?.detach();
      await this.page.close();
      await this.context?.close();
    }
  }

  private async shutdownBrowser() {
    if (this.browser) {
      await (await this.getBrowserInstance()).close();
    }
  }

  private handleSteps(steps: Array<{ name: string; handler: StepFn }>) {
    for (const step of steps) {
      it(step.name, async () => {
        try {
          await step.handler({ page: this.page!, kibanaUrl: this.getKibanaUrl() });
        } catch (e) {
          const error = new Error(`Step [${step.name}] failed: ${e.message}`);
          error.stack = e.stack;
          throw error; // Rethrow error if step fails otherwise it is silently passing
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

        this.log.debug(`[console.${message.type()}]`, text);
        this.log.debug(`     `, location);
      } catch (e) {
        this.log.error('Failed to evaluate log line from browser\n' + e);
      }
    };
  }
}
