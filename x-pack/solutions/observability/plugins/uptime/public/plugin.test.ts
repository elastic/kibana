/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import type { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import type { App, AppUpdater } from '@kbn/core-application-browser';
import { AppStatus } from '@kbn/core-application-browser';
import { enableLegacyUptimeApp } from '@kbn/observability-plugin/public';

import { UptimePlugin } from './plugin';
import type { ClientPluginsSetup, ClientPluginsStart } from './plugin';
import { UptimeDataHelper } from './legacy_uptime/app/uptime_overview_fetcher';

vi.mock('./legacy_uptime/app/uptime_overview_fetcher');
vi.mock('./legacy_uptime/lib/alert_types', () => {
      const mocked = {
      legacyAlertTypeInitializers: [],
      uptimeAlertTypeInitializers: [],
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./legacy_uptime/components/fleet_package', () => {
      const mocked = {
      LazySyntheticsPolicyCreateExtension: () => null,
      LazySyntheticsPolicyEditExtension: () => null,
    };
      return { ...mocked, default: mocked };
    });
vi.mock(
  './legacy_uptime/components/fleet_package/lazy_synthetics_custom_assets_extension',
  () => {
      const mocked = {
        LazySyntheticsCustomAssetsExtension: () => null,
      };
      return { ...mocked, default: mocked };
    }
);
vi.mock('./kibana_services', () => {
      const mocked = { setStartServices: vi.fn() };
      return { ...mocked, default: mocked };
    });

const mockUptimeDataHelper = UptimeDataHelper as MockedFunction<typeof UptimeDataHelper>;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const createInitContext = () =>
  ({
    config: { get: () => ({}) },
    env: { packageInfo: { version: '9.0.0' }, mode: { dev: false } },
  } as unknown as ConstructorParameters<typeof UptimePlugin>[0]);

const createPluginsSetup = () =>
  ({
    observability: { dashboard: { register: vi.fn() } },
    exploratoryView: { register: vi.fn() },
  } as unknown as ClientPluginsSetup);

const createPluginsStart = () =>
  ({
    fleet: { registerExtension: vi.fn() },
    observability: { observabilityRuleTypeRegistry: { register: vi.fn() } },
    triggersActionsUi: {
      ruleTypeRegistry: { has: vi.fn().mockReturnValue(false), register: vi.fn() },
    },
    share: { url: { locators: { create: vi.fn() } } },
    observabilityShared: { navigation: { registerSections: vi.fn() } },
  } as unknown as ClientPluginsStart);

const getLatestStatus = (updater$: BehaviorSubject<AppUpdater>): AppStatus | undefined => {
  let latest: Partial<App> | undefined;
  updater$
    .subscribe((updaterFn) => {
      latest = updaterFn({} as App);
    })
    .unsubscribe();
  return latest?.status;
};

interface Scenario {
  legacyEnabled?: boolean;
  hasUptimeCapability?: boolean;
  indexStatus?: 'data' | 'no-data' | 'error';
}

const setupPlugin = (scenario: Scenario = {}) => {
  const { legacyEnabled = false, hasUptimeCapability = true, indexStatus = 'no-data' } = scenario;

  const indexStatusMock = vi.fn();
  if (indexStatus === 'data') {
    indexStatusMock.mockResolvedValue({ indexExists: true, indices: 'heartbeat-*' });
  } else if (indexStatus === 'no-data') {
    indexStatusMock.mockResolvedValue({ indexExists: false, indices: '' });
  } else {
    // A user with feature visibility but no ES index read privileges gets a 403
    // from the index-status endpoint, which rejects the promise.
    indexStatusMock.mockRejectedValue({ body: { statusCode: 403 } });
  }

  mockUptimeDataHelper.mockReturnValue({
    indexStatus: indexStatusMock,
    overviewData: vi.fn(),
  } as unknown as ReturnType<typeof UptimeDataHelper>);

  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();

  (coreStart.uiSettings.get as Mock).mockImplementation((key: string) =>
    key === enableLegacyUptimeApp ? legacyEnabled : undefined
  );
  (coreStart.application as unknown as { capabilities: Record<string, unknown> }).capabilities = {
    ...coreStart.application.capabilities,
    uptime: { show: hasUptimeCapability },
  };

  const plugin = new UptimePlugin(createInitContext());
  plugin.setup(coreSetup, createPluginsSetup());

  const registerCall = (coreSetup.application.register as Mock).mock.calls[0][0];
  const updater$ = registerCall.updater$ as BehaviorSubject<AppUpdater>;

  return { plugin, coreStart, updater$, indexStatusMock };
};

describe('UptimePlugin app status', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers the app as inaccessible by default before the data check runs', () => {
    const { updater$ } = setupPlugin();

    expect(getLatestStatus(updater$)).toBe(AppStatus.inaccessible);
  });

  it('makes the app accessible when the legacy Uptime app setting is enabled', async () => {
    const { plugin, coreStart, updater$ } = setupPlugin({ legacyEnabled: true });

    plugin.start(coreStart, createPluginsStart());
    await flushPromises();

    expect(getLatestStatus(updater$)).toBe(AppStatus.accessible);
  });

  it('makes the app accessible when legacy heartbeat data exists', async () => {
    const { plugin, coreStart, updater$ } = setupPlugin({
      hasUptimeCapability: true,
      indexStatus: 'data',
    });

    plugin.start(coreStart, createPluginsStart());
    await flushPromises();

    expect(getLatestStatus(updater$)).toBe(AppStatus.accessible);
  });

  it('keeps the app inaccessible when there is no legacy heartbeat data', async () => {
    const { plugin, coreStart, updater$ } = setupPlugin({
      hasUptimeCapability: true,
      indexStatus: 'no-data',
    });

    plugin.start(coreStart, createPluginsStart());
    await flushPromises();

    expect(getLatestStatus(updater$)).toBe(AppStatus.inaccessible);
  });

  it('keeps the app inaccessible when the index-status check fails with a 403 (feature visibility but no ES index privileges)', async () => {
    const { plugin, coreStart, updater$, indexStatusMock } = setupPlugin({
      hasUptimeCapability: true,
      indexStatus: 'error',
    });

    plugin.start(coreStart, createPluginsStart());
    await flushPromises();

    expect(indexStatusMock).toHaveBeenCalled();
    expect(getLatestStatus(updater$)).toBe(AppStatus.inaccessible);
  });

  it('keeps the app inaccessible and skips the data check when the user lacks the Uptime capability', async () => {
    const { plugin, coreStart, updater$, indexStatusMock } = setupPlugin({
      hasUptimeCapability: false,
    });

    plugin.start(coreStart, createPluginsStart());
    await flushPromises();

    expect(indexStatusMock).not.toHaveBeenCalled();
    expect(getLatestStatus(updater$)).toBe(AppStatus.inaccessible);
  });
});
