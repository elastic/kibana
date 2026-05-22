/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationStart,
  HttpFetchOptionsWithPath,
  HttpInterceptor,
  HttpStart,
  IToasts,
  Toast,
} from '@kbn/core/public';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { BehaviorSubject } from 'rxjs';
import {
  __resetDuplicateRequestDetectorForTests,
  startDuplicateRequestDetector,
} from './duplicate_request_detector';
import {
  __resetDuplicateDetectionsManagerForTests,
  getDuplicateDetectionsManager,
} from './duplicate_detections_manager';
import {
  __resetDetectorSettingsForTests,
  getDetectorSettingsStore,
} from './duplicate_detections_settings';
import {
  __resetPluginOwnersStoreForTests,
  getPluginOwnersStore,
  type PluginOwnersSnapshot,
} from './duplicate_detections_owners';

interface FakeHttp {
  http: HttpStart;
  triggerRequest: (fetchOptions: HttpFetchOptionsWithPath) => void;
  triggerResponse: (fetchOptions: HttpFetchOptionsWithPath, body: unknown) => void;
  detach: jest.Mock;
  attached: () => boolean;
  fetch: jest.Mock;
}

const createFakeHttp = (
  fetchImpl: (path: string) => Promise<unknown> = async () =>
    ({ owners: {}, knownTeams: [] } as PluginOwnersSnapshot)
): FakeHttp => {
  let interceptor: HttpInterceptor | undefined;
  let attached = false;
  const detach = jest.fn(() => {
    attached = false;
    interceptor = undefined;
  });
  const fetch = jest.fn((path: string) => fetchImpl(path));
  const http = {
    intercept: jest.fn((next: HttpInterceptor) => {
      interceptor = next;
      attached = true;
      return detach;
    }),
    fetch,
  } as unknown as HttpStart;

  return {
    http,
    detach,
    attached: () => attached,
    fetch,
    triggerRequest: (fetchOptions) => {
      if (!attached) return;
      interceptor?.request?.(fetchOptions, { halted: false, halt: jest.fn() });
    },
    triggerResponse: (fetchOptions, body) => {
      if (!attached) return;
      interceptor?.response?.(
        {
          fetchOptions,
          request: {} as Request,
          response: {} as Response,
          body,
        },
        { halted: false, halt: jest.fn() }
      );
    },
  };
};

interface FakeToasts {
  toasts: IToasts;
  addWarning: jest.Mock;
  remove: jest.Mock;
  toastList$: BehaviorSubject<Toast[]>;
}

const createFakeToasts = (): FakeToasts => {
  const toastList$ = new BehaviorSubject<Toast[]>([]);
  let nextId = 1;
  const addWarning = jest.fn((input: any): Toast => {
    const toast: Toast = {
      ...(typeof input === 'string' ? { title: input } : input),
      id: `t-${nextId++}`,
    };
    toastList$.next([...toastList$.getValue(), toast]);
    return toast;
  });
  const remove = jest.fn((toastOrId: Toast | string) => {
    const id = typeof toastOrId === 'string' ? toastOrId : toastOrId.id;
    toastList$.next(toastList$.getValue().filter((t) => t.id !== id));
  });
  const toasts: IToasts = {
    get$: () => toastList$,
    add: jest.fn(),
    remove,
    addInfo: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: addWarning as IToasts['addWarning'],
    addDanger: jest.fn(),
    addError: jest.fn(),
  };
  return { toasts, addWarning, remove, toastList$ };
};

const createFakeRendering = (): RenderingService =>
  ({
    addContext: (node: unknown) => node,
  } as unknown as RenderingService);

interface FakeOverlays {
  overlays: OverlayStart;
  openFlyout: jest.Mock;
  close: jest.Mock;
}

const createFakeOverlays = (): FakeOverlays => {
  const close = jest.fn();
  const openFlyout = jest.fn(() => ({ close, onClose: Promise.resolve() }));
  const overlays = { openFlyout } as unknown as OverlayStart;
  return { overlays, openFlyout, close };
};

interface FakeApplication {
  application: ApplicationStart;
  currentAppId$: BehaviorSubject<string | undefined>;
  setCurrentAppId: (id: string | undefined) => void;
}

const createFakeApplication = (
  initialAppId: string | undefined = 'synthetics'
): FakeApplication => {
  const currentAppId$ = new BehaviorSubject<string | undefined>(initialAppId);
  const application = { currentAppId$ } as unknown as ApplicationStart;
  return {
    application,
    currentAppId$,
    setCurrentAppId: (id) => currentAppId$.next(id),
  };
};

const makeRequest = (
  overrides: Partial<HttpFetchOptionsWithPath> = {}
): HttpFetchOptionsWithPath => ({
  path: '/api/example',
  method: 'GET',
  ...overrides,
});

describe('startDuplicateRequestDetector', () => {
  beforeEach(() => {
    __resetDuplicateRequestDetectorForTests();
    __resetDuplicateDetectionsManagerForTests();
    __resetDetectorSettingsForTests();
    __resetPluginOwnersStoreForTests();
  });

  afterEach(() => {
    __resetDuplicateRequestDetectorForTests();
    __resetDuplicateDetectionsManagerForTests();
    __resetDetectorSettingsForTests();
    __resetPluginOwnersStoreForTests();
    jest.useRealTimers();
  });

  it('does not create a toast on a single request', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const opts = makeRequest();
    triggerRequest(opts);
    triggerResponse(opts, { value: 1 });

    expect(addWarning).not.toHaveBeenCalled();
  });

  it('creates exactly ONE toast across many detections', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
      toastCooldownMs: 0,
    });

    const burst = (path: string) => {
      const opts = makeRequest({ path });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };
    burst('/api/a');
    burst('/api/b');
    burst('/api/c');

    expect(addWarning).toHaveBeenCalledTimes(1);
  });

  it('only installs the HTTP interceptor once across multiple startDuplicateRequestDetector calls', () => {
    const { http: httpA, attached: attachedA } = createFakeHttp();
    const { http: httpB, attached: attachedB } = createFakeHttp();
    const { toasts } = createFakeToasts();
    const rendering = createFakeRendering();
    const { overlays } = createFakeOverlays();
    const { application } = createFakeApplication();

    startDuplicateRequestDetector({
      http: httpA,
      application,
      toasts,
      overlays,
      rendering,
      source: 'slo',
    });
    startDuplicateRequestDetector({
      http: httpB,
      application,
      toasts,
      overlays,
      rendering,
      source: 'synthetics',
    });

    expect(attachedA()).toBe(true);
    expect(attachedB()).toBe(false);
  });

  it('records the full URL (path + sorted query string) in the displayed path', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      application: createFakeApplication().application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'kibana',
      toastCooldownMs: 0,
    });

    const opts = makeRequest({
      path: '/internal/data_views/fields',
      query: {
        pattern: 'synthetics-*',
        meta_fields: ['_source', '_id'],
        allow_no_index: true,
      },
    });
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });

    const events = getDuplicateDetectionsManager().__getEventsForTests();
    expect(events).toHaveLength(1);
    expect(events[0].path).toBe(
      '/internal/data_views/fields?allow_no_index=true&meta_fields=_id&meta_fields=_source&pattern=synthetics-*'
    );
  });

  it('treats requests to the same path with different query strings as separate detections (and does not cross-suppress them via cooldown)', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      application: createFakeApplication().application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'kibana',
      toastCooldownMs: 60_000,
    });

    const burst = (pattern: string) => {
      const opts = makeRequest({
        path: '/internal/data_views/fields',
        query: { pattern },
      });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };

    burst('synthetics-*');
    burst('.alerts-observability*');

    const events = getDuplicateDetectionsManager().__getEventsForTests();
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.path).sort()).toEqual([
      '/internal/data_views/fields?pattern=.alerts-observability*',
      '/internal/data_views/fields?pattern=synthetics-*',
    ]);
  });

  it('derives the source from the URL (segment after /api/ or /internal/) and tags the active app id separately', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    const { application } = createFakeApplication('synthetics');
    startDuplicateRequestDetector({
      http,
      application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'fallback',
      toastCooldownMs: 0,
    });

    const burst = (path: string) => {
      const opts = makeRequest({ path });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };

    burst('/internal/security/me');
    burst('/internal/telemetry/config');
    burst('/api/spaces/space');
    burst('/api/synthetics/monitors');

    const events = getDuplicateDetectionsManager().__getEventsForTests();
    expect(events.map((e) => ({ path: e.path, source: e.source, app: e.app }))).toEqual([
      // Newest-first ordering (see manager.record).
      { path: '/api/synthetics/monitors', source: 'synthetics', app: 'synthetics' },
      { path: '/api/spaces/space', source: 'spaces', app: 'synthetics' },
      { path: '/internal/telemetry/config', source: 'telemetry', app: 'synthetics' },
      { path: '/internal/security/me', source: 'security', app: 'synthetics' },
    ]);
  });

  it('falls back to the active app id, then the static source option, when the URL does not match the /api|/internal/<plugin>/ convention', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    const { application, setCurrentAppId } = createFakeApplication('synthetics');
    startDuplicateRequestDetector({
      http,
      application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'fallback',
      toastCooldownMs: 0,
    });

    const burst = (path: string) => {
      const opts = makeRequest({ path });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };

    // Path has no /api/ or /internal/ prefix → fall back to current app id.
    burst('/some/unconventional/path');
    setCurrentAppId(undefined);
    // No active app either → fall back to the static `source`.
    burst('/another/unconventional/path');

    const events = getDuplicateDetectionsManager().__getEventsForTests();
    expect(events.map((e) => e.source)).toEqual(['fallback', 'synthetics']);
  });

  it('uses a MountPoint for the toast body (not a static string)', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const opts = makeRequest();
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });

    expect(addWarning).toHaveBeenCalledTimes(1);
    const arg = addWarning.mock.calls[0][0];
    expect(typeof arg.text).toBe('function');
  });

  it('respects the configured toastLifeTimeMs', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
      toastLifeTimeMs: 123_456,
    });

    const opts = makeRequest();
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });

    expect(addWarning.mock.calls[0][0].toastLifeTimeMs).toBe(123_456);
  });

  it('does NOT record duplicates when request payloads differ', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const optsA = makeRequest({ path: '/api/x', query: { id: 'a' } });
    const optsB = makeRequest({ path: '/api/x', query: { id: 'b' } });

    triggerRequest(optsA);
    triggerRequest(optsB);
    triggerResponse(optsA, { ok: true });
    triggerResponse(optsB, { ok: true });

    expect(addWarning).not.toHaveBeenCalled();
  });

  it('does NOT record duplicates when response bodies differ', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const opts = makeRequest({ path: '/api/x' });
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { items: [1] });
    triggerResponse(opts, { items: [1, 2] });

    expect(addWarning).not.toHaveBeenCalled();
  });

  it('treats payload key ordering as equivalent', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    triggerRequest(makeRequest({ path: '/api/x', query: { a: 1, b: 2 } }));
    triggerRequest(makeRequest({ path: '/api/x', query: { b: 2, a: 1 } }));
    triggerResponse(makeRequest({ path: '/api/x', query: { a: 1, b: 2 } }), { ok: true });
    triggerResponse(makeRequest({ path: '/api/x', query: { b: 2, a: 1 } }), { ok: true });

    expect(addWarning).toHaveBeenCalledTimes(1);
  });

  it('ignores requests to default-excluded prefixes', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const opts = makeRequest({ path: '/translations/en.json' });
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { hello: 'world' });
    triggerResponse(opts, { hello: 'world' });

    expect(addWarning).not.toHaveBeenCalled();
  });

  it('respects custom duplicateThreshold', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
      duplicateThreshold: 3,
    });

    const opts = makeRequest();
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    expect(addWarning).not.toHaveBeenCalled();

    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    expect(addWarning).toHaveBeenCalledTimes(1);
  });

  it('throttles repeat detections for the same endpoint via toastCooldownMs', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
      toastCooldownMs: 10_000,
    });

    const opts = makeRequest();
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(1);

    jest.advanceTimersByTime(1_000);
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(1);

    jest.advanceTimersByTime(15_000);
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(2);
  });

  it('prunes entries that fall outside the sliding window', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
      windowMs: 1_000,
    });

    const opts = makeRequest();
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });

    jest.advanceTimersByTime(2_000);

    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });

    expect(addWarning).not.toHaveBeenCalled();
  });

  it('treats different HTTP methods on the same path as distinct buckets', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const getOpts = makeRequest({ method: 'GET', path: '/api/x' });
    const postOpts = makeRequest({ method: 'POST', path: '/api/x' });

    triggerRequest(getOpts);
    triggerRequest(postOpts);
    triggerResponse(getOpts, { v: 1 });
    triggerResponse(postOpts, { v: 1 });

    expect(addWarning).not.toHaveBeenCalled();
  });

  it('keeps the accumulated events when the toast is dismissed and re-pops on the next detection', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning, remove } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const opts = makeRequest({ path: '/api/x' });
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });
    expect(addWarning).toHaveBeenCalledTimes(1);

    const toast = addWarning.mock.results[0].value as Toast;
    remove(toast);

    // Toast handle is forgotten so the next detection re-pops a fresh one…
    expect(getDuplicateDetectionsManager().__getActiveToastForTests()).toBeNull();
    // …but the accumulated events stay around (the flyout might be showing them).
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(1);

    const opts2 = makeRequest({ path: '/api/y' });
    triggerRequest(opts2);
    triggerRequest(opts2);
    triggerResponse(opts2, { v: 2 });
    triggerResponse(opts2, { v: 2 });

    expect(addWarning).toHaveBeenCalledTimes(2);
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(2);
  });

  it('does not clear the events ring buffer while the flyout is open and the toast disappears (regression)', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning, remove } = createFakeToasts();
    const { overlays } = createFakeOverlays();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const opts = makeRequest({ path: '/api/x' });
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });

    getDuplicateDetectionsManager().openDetailsFlyout();
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(1);

    // Simulate the toast auto-expiring (or the user dismissing it) while the
    // flyout is still open – the events must survive so the flyout keeps
    // showing the data the user is inspecting.
    const toast = addWarning.mock.results[0].value as Toast;
    remove(toast);

    expect(getDuplicateDetectionsManager().__isFlyoutOpenForTests()).toBe(true);
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(1);
  });

  it('opens the deep-dive flyout via overlays.openFlyout when the manager is asked', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    const { overlays, openFlyout } = createFakeOverlays();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const opts = makeRequest({ path: '/api/x' });
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });

    getDuplicateDetectionsManager().openDetailsFlyout();

    expect(openFlyout).toHaveBeenCalledTimes(1);
    expect(getDuplicateDetectionsManager().__isFlyoutOpenForTests()).toBe(true);
  });

  it('dismisses the active toast when the flyout opens and skips popping new toasts while it stays open', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning, remove } = createFakeToasts();
    const { overlays } = createFakeOverlays();
    startDuplicateRequestDetector({
      http,
      application: createFakeApplication().application,
      toasts,
      overlays,
      rendering: createFakeRendering(),
      source: 'kibana',
      toastCooldownMs: 0,
    });

    const burst = (path: string) => {
      const opts = makeRequest({ path });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };

    burst('/api/x');
    expect(addWarning).toHaveBeenCalledTimes(1);

    getDuplicateDetectionsManager().openDetailsFlyout();
    // Toast must be dismissed once the flyout takes over the visual.
    expect(remove).toHaveBeenCalledTimes(1);
    expect(getDuplicateDetectionsManager().__getActiveToastForTests()).toBeNull();

    // New bursts while the flyout is open update the table but must NOT re-pop
    // a toast – the data is already visible.
    burst('/api/y');
    burst('/api/z');
    expect(addWarning).toHaveBeenCalledTimes(1);
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(3);
  });

  it('pauseDetection() flips the enabled setting off and dismisses the active toast', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning, remove } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      application: createFakeApplication().application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'kibana',
      toastCooldownMs: 0,
    });

    const burst = (path: string) => {
      const opts = makeRequest({ path });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };

    burst('/api/x');
    expect(addWarning).toHaveBeenCalledTimes(1);

    getDuplicateDetectionsManager().pauseDetection();
    expect(getDetectorSettingsStore().get().enabled).toBe(false);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(getDuplicateDetectionsManager().__getActiveToastForTests()).toBeNull();

    // Future bursts must be ignored while paused.
    burst('/api/y');
    expect(addWarning).toHaveBeenCalledTimes(1);
  });

  it('does not stack multiple flyouts when openDetailsFlyout is called twice', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    const { overlays, openFlyout } = createFakeOverlays();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const opts = makeRequest();
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });

    getDuplicateDetectionsManager().openDetailsFlyout();
    getDuplicateDetectionsManager().openDetailsFlyout();

    expect(openFlyout).toHaveBeenCalledTimes(1);
  });

  it('clearAll() drops the events ring buffer and dismisses the toast', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, remove } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    const opts = makeRequest({ path: '/api/x' });
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });

    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(1);
    getDuplicateDetectionsManager().clearAll();

    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(0);
    expect(getDuplicateDetectionsManager().__getActiveToastForTests()).toBeNull();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('does not record anything when the user-disabled setting is true', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts, addWarning } = createFakeToasts();
    getDetectorSettingsStore().update({ enabled: false });
    startDuplicateRequestDetector({
      http,
      application: createFakeApplication().application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'kibana',
    });

    const opts = makeRequest();
    triggerRequest(opts);
    triggerRequest(opts);
    triggerResponse(opts, { v: 1 });
    triggerResponse(opts, { v: 1 });

    expect(addWarning).not.toHaveBeenCalled();
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(0);
  });

  it('reacts live when the user toggles the enabled setting at runtime', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      application: createFakeApplication().application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'kibana',
      toastCooldownMs: 0,
    });

    const burst = (path: string) => {
      const opts = makeRequest({ path });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };

    burst('/api/a');
    getDetectorSettingsStore().update({ enabled: false });
    burst('/api/b');
    getDetectorSettingsStore().update({ enabled: true });
    burst('/api/c');

    const paths = getDuplicateDetectionsManager()
      .__getEventsForTests()
      .map((e) => e.path);
    expect(paths).toEqual(['/api/c', '/api/a']);
  });

  it('honors user-defined ignoredPathPrefixes (in addition to the built-in defaults)', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    getDetectorSettingsStore().update({ ignoredPathPrefixes: ['/api/saved_objects'] });
    startDuplicateRequestDetector({
      http,
      application: createFakeApplication().application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'kibana',
      toastCooldownMs: 0,
    });

    const burst = (path: string) => {
      const opts = makeRequest({ path });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };

    burst('/api/saved_objects/_find');
    burst('/api/synthetics/monitors');

    const events = getDuplicateDetectionsManager().__getEventsForTests();
    expect(events).toHaveLength(1);
    expect(events[0].path).toBe('/api/synthetics/monitors');
  });

  it('only records detections matching scopedSources when that filter is non-empty', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    getDetectorSettingsStore().update({ scopedSources: ['synthetics'] });
    startDuplicateRequestDetector({
      http,
      application: createFakeApplication().application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'kibana',
      toastCooldownMs: 0,
    });

    const burst = (path: string) => {
      const opts = makeRequest({ path });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };

    burst('/api/synthetics/monitors');
    burst('/api/spaces/space');
    burst('/internal/telemetry/config');

    const sources = getDuplicateDetectionsManager()
      .__getEventsForTests()
      .map((e) => e.source);
    expect(sources).toEqual(['synthetics']);
  });

  describe('scopedTeams filter', () => {
    const seedOwners = (snapshot: PluginOwnersSnapshot) => {
      getPluginOwnersStore().snapshot$.next(snapshot);
    };

    it('keeps detections owned by any selected team and drops the rest', async () => {
      const { http, triggerRequest, triggerResponse } = createFakeHttp();
      const { toasts } = createFakeToasts();
      seedOwners({
        owners: {
          synthetics: ['@elastic/actionable-obs-team'],
          slo: ['@elastic/actionable-obs-team'],
          spaces: ['@elastic/kibana-security'],
          telemetry: ['@elastic/kibana-core'],
        },
        knownTeams: [
          '@elastic/actionable-obs-team',
          '@elastic/kibana-core',
          '@elastic/kibana-security',
        ],
      });
      getDetectorSettingsStore().update({ scopedTeams: ['@elastic/actionable-obs-team'] });

      startDuplicateRequestDetector({
        http,
        application: createFakeApplication().application,
        toasts,
        overlays: createFakeOverlays().overlays,
        rendering: createFakeRendering(),
        source: 'kibana',
        toastCooldownMs: 0,
      });

      const burst = (path: string) => {
        const opts = makeRequest({ path });
        triggerRequest(opts);
        triggerRequest(opts);
        triggerResponse(opts, { v: 1 });
        triggerResponse(opts, { v: 1 });
      };

      burst('/api/synthetics/monitors');
      burst('/api/slo/_find');
      burst('/api/spaces/space');
      burst('/internal/telemetry/config');

      const sources = getDuplicateDetectionsManager()
        .__getEventsForTests()
        .map((e) => e.source);
      expect(sources.sort()).toEqual(['slo', 'synthetics']);
    });

    it('drops detections from plugins with no known owner when scopedTeams is set', async () => {
      const { http, triggerRequest, triggerResponse } = createFakeHttp();
      const { toasts } = createFakeToasts();
      seedOwners({
        owners: { synthetics: ['@elastic/actionable-obs-team'] },
        knownTeams: ['@elastic/actionable-obs-team'],
      });
      getDetectorSettingsStore().update({ scopedTeams: ['@elastic/actionable-obs-team'] });

      startDuplicateRequestDetector({
        http,
        application: createFakeApplication().application,
        toasts,
        overlays: createFakeOverlays().overlays,
        rendering: createFakeRendering(),
        source: 'kibana',
        toastCooldownMs: 0,
      });

      const burst = (path: string) => {
        const opts = makeRequest({ path });
        triggerRequest(opts);
        triggerRequest(opts);
        triggerResponse(opts, { v: 1 });
        triggerResponse(opts, { v: 1 });
      };

      burst('/api/synthetics/monitors');
      burst('/api/never-heard-of-it/_find');

      const sources = getDuplicateDetectionsManager()
        .__getEventsForTests()
        .map((e) => e.source);
      expect(sources).toEqual(['synthetics']);
    });

    it('is a silent no-op when scopedTeams is set but the owners snapshot is still empty', () => {
      const { http, triggerRequest, triggerResponse } = createFakeHttp();
      const { toasts } = createFakeToasts();
      // Note: not seeding owners; the snapshot stays empty (fetch in flight).
      getDetectorSettingsStore().update({ scopedTeams: ['@elastic/actionable-obs-team'] });

      startDuplicateRequestDetector({
        http,
        application: createFakeApplication().application,
        toasts,
        overlays: createFakeOverlays().overlays,
        rendering: createFakeRendering(),
        source: 'kibana',
        toastCooldownMs: 0,
      });

      const opts = makeRequest({ path: '/api/synthetics/monitors' });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });

      // Filter must not produce a false negative just because data isn't loaded.
      expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(1);
    });

    it('kicks off a single owners fetch on startup', () => {
      const { http, fetch } = createFakeHttp();
      const { toasts } = createFakeToasts();
      startDuplicateRequestDetector({
        http,
        application: createFakeApplication().application,
        toasts,
        overlays: createFakeOverlays().overlays,
        rendering: createFakeRendering(),
        source: 'kibana',
      });
      expect(fetch).toHaveBeenCalledWith('/internal/observability/dev_tools/plugin_owners', {
        method: 'GET',
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('developer toolbar item registration', () => {
    const buildDetectorArgs = () => {
      const { http } = createFakeHttp();
      const { toasts } = createFakeToasts();
      return {
        http,
        application: createFakeApplication().application,
        toasts,
        overlays: createFakeOverlays().overlays,
        rendering: createFakeRendering(),
        source: 'kibana',
      };
    };

    it('does not register anything when the developerToolbar option is omitted', () => {
      startDuplicateRequestDetector(buildDetectorArgs());
      expect(getDuplicateDetectionsManager().__isToolbarItemRegisteredForTests()).toBe(false);
    });

    it('registers exactly one toolbar item on first start', () => {
      const registerItem = jest.fn(() => () => {});
      startDuplicateRequestDetector({
        ...buildDetectorArgs(),
        developerToolbar: { registerItem },
      });
      expect(registerItem).toHaveBeenCalledTimes(1);
      expect(registerItem).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'Duplicate request detector',
          priority: 10,
          children: expect.any(Object),
        })
      );
      expect(getDuplicateDetectionsManager().__isToolbarItemRegisteredForTests()).toBe(true);
    });

    it('is idempotent across multiple detector starts (singleton guard)', () => {
      const registerItem = jest.fn(() => () => {});

      // First start (e.g. SLO) registers
      startDuplicateRequestDetector({
        ...buildDetectorArgs(),
        developerToolbar: { registerItem },
      });
      // Second start (e.g. Synthetics) must NOT re-register or the toolbar
      // would briefly show two icons.
      startDuplicateRequestDetector({
        ...buildDetectorArgs(),
        developerToolbar: { registerItem },
      });

      expect(registerItem).toHaveBeenCalledTimes(1);
    });
  });

  it('excludePath() adds the prefix to settings AND purges matching events from the ring buffer', () => {
    const { http, triggerRequest, triggerResponse } = createFakeHttp();
    const { toasts } = createFakeToasts();
    startDuplicateRequestDetector({
      http,
      application: createFakeApplication().application,
      toasts,
      overlays: createFakeOverlays().overlays,
      rendering: createFakeRendering(),
      source: 'kibana',
      toastCooldownMs: 0,
    });

    const burst = (path: string, query?: Record<string, string>) => {
      const opts = makeRequest({ path, query });
      triggerRequest(opts);
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      triggerResponse(opts, { v: 1 });
    };

    burst('/internal/data_views/fields', { pattern: 'a' });
    burst('/internal/data_views/fields', { pattern: 'b' });
    burst('/api/synthetics/monitors');

    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(3);

    getDuplicateDetectionsManager().excludePath('/internal/data_views/fields');

    const remaining = getDuplicateDetectionsManager().__getEventsForTests();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].path).toBe('/api/synthetics/monitors');
    expect(getDetectorSettingsStore().get().ignoredPathPrefixes).toContain(
      '/internal/data_views/fields'
    );

    // A subsequent burst on the muted prefix is now ignored by the interceptor.
    burst('/internal/data_views/fields', { pattern: 'c' });
    expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(1);
  });

  it('is a no-op in production builds (does not attach the interceptor or record events)', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { http, attached, triggerRequest, triggerResponse } = createFakeHttp();
      const { toasts, addWarning } = createFakeToasts();
      const handle = startDuplicateRequestDetector({
        http,
        application: createFakeApplication().application,
        toasts,
        overlays: createFakeOverlays().overlays,
        rendering: createFakeRendering(),
        source: 'kibana',
      });

      expect(attached()).toBe(false);
      expect(typeof handle.stop).toBe('function');
      // Calling stop on the inert handle should also be safe.
      handle.stop();

      // The fake triggers are guarded by `attached`, so this is just belt-and-
      // suspenders – nothing should pop a toast.
      const opts = makeRequest();
      triggerRequest(opts);
      triggerResponse(opts, { v: 1 });
      expect(addWarning).not.toHaveBeenCalled();
      expect(getDuplicateDetectionsManager().__getEventsForTests()).toHaveLength(0);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('removes the interceptor when stop() is called', () => {
    const { http, detach } = createFakeHttp();
    const { toasts } = createFakeToasts();
    const { overlays } = createFakeOverlays();
    const handle = startDuplicateRequestDetector({
      http,
      toasts,
      application: createFakeApplication().application,
      overlays,
      rendering: createFakeRendering(),
      source: 'SLO',
    });

    handle.stop();
    expect(detach).toHaveBeenCalledTimes(1);
  });
});
