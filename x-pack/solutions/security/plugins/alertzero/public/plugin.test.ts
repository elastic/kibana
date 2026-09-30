/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { AppStatus, type AppUpdater } from '@kbn/core/public';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { getInvestigationTabIds } from '@kbn/agentic-investigations-common';
import {
  BehaviorSubject,
  EMPTY,
  Subject,
  filter,
  firstValueFrom,
  map,
  type Observable,
} from 'rxjs';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import type { AlertZeroClientConfig } from './types';
import { AlertZeroPublicPlugin } from './plugin';

const createLicensing = () => ({
  ...licensingMock.createStart(),
  license$: new BehaviorSubject(
    licensingMock.createLicense({ license: { type: 'enterprise', status: 'active' } })
  ),
});

const createConfig = (overrides: Partial<AlertZeroClientConfig> = {}): AlertZeroClientConfig => ({
  enabled: false,
  ...overrides,
});

const createContext = (
  config: AlertZeroClientConfig,
  buildFlavor: 'traditional' | 'serverless' = 'traditional'
) =>
  coreMock.createPluginInitializerContext(config, {
    buildFlavor,
  }) as unknown as ConstructorParameters<typeof AlertZeroPublicPlugin>[0];

/** `coreMock` returns a plain jest mock for `get$`; wire it to the setting under test. */
const withSetting = (
  core: ReturnType<typeof coreMock.createStart>,
  setting$: Observable<boolean>
) => {
  (core.uiSettings.get$ as jest.Mock).mockImplementation((id: string) => {
    if (id !== ALERTZERO_ENABLED_SETTING_ID) {
      throw new Error(`Unexpected uiSetting read: ${id}`);
    }
    return setting$;
  });
  core.application.capabilities = {
    ...core.application.capabilities,
    alertzero: { show: true, write: true },
  };
  return core;
};

describe('AlertZeroPublicPlugin app registration', () => {
  const setupPlugin = (
    setting$: Observable<boolean>,
    enabled = true,
    buildFlavor: 'traditional' | 'serverless' = 'traditional'
  ) => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled }), buildFlavor));
    const coreSetup = coreMock.createSetup();
    const coreStart = withSetting(coreMock.createStart(), setting$);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}] as never);

    plugin.setup(coreSetup as never, {} as never);

    return { coreSetup, plugin, coreStart };
  };

  it('does not register the browser app when the deployment kill switch is off', () => {
    const { coreSetup } = setupPlugin(new BehaviorSubject(true), false);

    expect(coreSetup.application.register).not.toHaveBeenCalled();
  });

  it('registers the browser app as inaccessible so core strips its nav and deep links', () => {
    const { coreSetup } = setupPlugin(new BehaviorSubject(false));

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'alertzero',
        appRoute: '/app/alertzero',
        status: AppStatus.inaccessible,
      })
    );
  });

  // updater$ is a Subject driven by start(); filter out deep-link-only emissions (no status)
  const statusUpdates$ = (updater$: Observable<AppUpdater>) =>
    updater$.pipe(
      map((fn) => fn({} as never)?.status),
      filter((s): s is AppStatus => s !== undefined)
    );

  const nextStatus = async (setting$: Observable<boolean>) => {
    const { coreSetup, plugin, coreStart } = setupPlugin(setting$);
    const { updater$ } = (coreSetup.application.register as jest.Mock).mock.calls[0][0] as {
      updater$: Observable<AppUpdater>;
    };
    const firstStatus = firstValueFrom(statusUpdates$(updater$));
    plugin.start(
      coreStart as never,
      {
        licensing: createLicensing(),
        agenticInvestigations: {},
        proposals: {},
        agentBuilder: agentBuilderMocks.createStart(),
      } as never
    );
    return firstStatus;
  };

  it('flips the app to accessible while the setting is on', async () => {
    expect(await nextStatus(new BehaviorSubject(true))).toBe(AppStatus.accessible);
  });

  it('keeps the app inaccessible while the setting is off', async () => {
    expect(await nextStatus(new BehaviorSubject(false))).toBe(AppStatus.inaccessible);
  });

  it.each([true, false])(
    'updates navigation for read access = %s without removing the URL gate',
    async (canRead) => {
      const { coreSetup, plugin, coreStart } = setupPlugin(new BehaviorSubject(true));
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        alertzero: { show: canRead, write: false },
        proposals: { showProposals: false },
      };
      const { updater$ } = coreSetup.application.register.mock.calls[0][0];
      if (!updater$) throw new Error('Missing application updater');
      const nextUpdate = firstValueFrom(updater$.pipe(map((update) => update({} as never))));
      plugin.start(coreStart, { licensing: createLicensing() });
      const update = await nextUpdate;
      expect(update?.status).toBe(AppStatus.accessible);
      expect(update?.visibleIn).toEqual(
        canRead ? ['classicSideNav', 'projectSideNav', 'globalSearch'] : []
      );
      expect(update?.deepLinks?.length).toBe(canRead ? 6 : 0);
      plugin.stop();
    }
  );

  it('hides navigation until a valid Enterprise license arrives and on later downgrades', () => {
    const { coreSetup, plugin, coreStart } = setupPlugin(new BehaviorSubject(true));
    const { updater$ } = coreSetup.application.register.mock.calls[0][0];
    if (!updater$) throw new Error('Missing application updater');
    const onUpdate = jest.fn();
    const subscription = updater$.pipe(map((update) => update({} as never))).subscribe(onUpdate);
    const license$ = new Subject<ReturnType<typeof licensingMock.createLicense>>();
    plugin.start(coreStart, { licensing: { ...createLicensing(), license$ } });

    expect(onUpdate).toHaveBeenLastCalledWith({
      status: AppStatus.accessible,
      visibleIn: [],
      deepLinks: [],
    });

    for (const license of [
      { type: 'basic', status: 'active', visible: false },
      { type: 'enterprise', status: 'active', visible: true },
      { type: 'enterprise', status: 'expired', visible: false },
      { type: 'enterprise', status: 'active', visible: true },
    ] as const) {
      license$.next(licensingMock.createLicense({ license }));
      expect(onUpdate).toHaveBeenLastCalledWith({
        status: AppStatus.accessible,
        visibleIn: license.visible ? ['classicSideNav', 'projectSideNav', 'globalSearch'] : [],
        deepLinks: license.visible ? expect.any(Array) : [],
      });
      if (license.visible) expect(onUpdate.mock.lastCall?.[0].deepLinks).toHaveLength(6);
    }
    subscription.unsubscribe();
    plugin.stop();
  });

  it('updates navigation when Serverless tier eligibility changes while preserving direct URLs', () => {
    const { coreSetup, plugin, coreStart } = setupPlugin(
      new BehaviorSubject(true),
      true,
      'serverless'
    );
    const { updater$ } = coreSetup.application.register.mock.calls[0][0];
    if (!updater$) throw new Error('Missing application updater');
    const onUpdate = jest.fn();
    const subscription = updater$.pipe(map((update) => update({} as never))).subscribe(onUpdate);
    const contract = plugin.start(coreStart, { licensing: createLicensing() });

    expect(onUpdate).toHaveBeenLastCalledWith({
      status: AppStatus.accessible,
      visibleIn: [],
      deepLinks: [],
    });
    contract.setServerlessTierAvailable(true);
    expect(onUpdate).toHaveBeenLastCalledWith({
      status: AppStatus.accessible,
      visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
      deepLinks: expect.any(Array),
    });
    expect(onUpdate.mock.lastCall?.[0].deepLinks).toHaveLength(6);
    contract.setServerlessTierAvailable(false);
    expect(onUpdate).toHaveBeenLastCalledWith({
      status: AppStatus.accessible,
      visibleIn: [],
      deepLinks: [],
    });
    subscription.unsubscribe();
    plugin.stop();
  });

  it('tracks later changes to the setting without a page reload', async () => {
    const setting$ = new BehaviorSubject(false);
    const { coreSetup, plugin, coreStart } = setupPlugin(setting$);
    const { updater$ } = (coreSetup.application.register as jest.Mock).mock.calls[0][0] as {
      updater$: Observable<AppUpdater>;
    };

    const statuses: AppStatus[] = [];
    const subscription = statusUpdates$(updater$).subscribe((s) => statuses.push(s));
    plugin.start(
      coreStart as never,
      {
        licensing: createLicensing(),
        agenticInvestigations: {},
        proposals: {},
        agentBuilder: agentBuilderMocks.createStart(),
      } as never
    );
    setting$.next(true);
    subscription.unsubscribe();

    expect(statuses).toEqual([AppStatus.inaccessible, AppStatus.accessible]);
  });
});

describe('AlertZeroPublicPlugin conversation template UI registration', () => {
  const startPlugin = (setting$: Observable<boolean>, enabled = true) => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled })));
    const agentBuilder = agentBuilderMocks.createStart();

    plugin.start(withSetting(coreMock.createStart(), setting$), {
      licensing: createLicensing(),
      agenticInvestigations: {},
      proposals: {},
      agentBuilder,
    } as never);

    return { agentBuilder, plugin };
  };

  it('registers the investigation template UI and its tabs when the setting is on', () => {
    const { agentBuilder } = startPlugin(new BehaviorSubject(true));
    const { conversationTemplates } = agentBuilder;

    expect(conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledWith(
      'investigation',
      expect.any(Function)
    );
    for (const tabId of getInvestigationTabIds('investigation')) {
      expect(conversationTemplates.registerTab).toHaveBeenCalledWith(tabId, expect.any(Function));
    }
  });

  it('registers nothing while the setting is off', () => {
    const { agentBuilder } = startPlugin(new BehaviorSubject(false));

    expect(agentBuilder.conversationTemplates.registerTemplateUIDefinition).not.toHaveBeenCalled();
    expect(agentBuilder.conversationTemplates.registerTab).not.toHaveBeenCalled();
  });

  it('registers once the setting is turned on, and only once', () => {
    const setting$ = new BehaviorSubject(false);
    const { agentBuilder } = startPlugin(setting$);

    setting$.next(true);
    setting$.next(false);
    setting$.next(true);

    // Both investigation and escalation templates are registered exactly once on the first `true`
    // emission; subsequent `true` emissions are ignored because of `take(1)`.
    expect(agentBuilder.conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledTimes(
      2
    );
  });

  it('registers nothing when the deployment kill switch is off', () => {
    const { agentBuilder } = startPlugin(new BehaviorSubject(true), false);

    expect(agentBuilder.conversationTemplates.registerTemplateUIDefinition).not.toHaveBeenCalled();
  });
});

describe('AlertZeroPublicPlugin Serverless entitlement', () => {
  it.each([true, false])(
    'uses tier entitlement independently of license availability (%s)',
    (hasLicense) => {
      const context = coreMock.createPluginInitializerContext(createConfig({ enabled: true }), {
        buildFlavor: 'serverless',
      });
      const plugin = new AlertZeroPublicPlugin(context);
      const core = withSetting(coreMock.createStart(), new BehaviorSubject(true));
      const agentBuilder = agentBuilderMocks.createStart();
      const contract = plugin.start(core, {
        licensing: hasLicense ? createLicensing() : { ...createLicensing(), license$: EMPTY },
        agentBuilder,
        agenticInvestigations: {},
        proposals: {},
      });
      expect(
        agentBuilder.conversationTemplates.registerTemplateUIDefinition
      ).not.toHaveBeenCalled();
      contract.setServerlessTierAvailable(true);
      expect(agentBuilder.conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalled();
      plugin.stop();
    }
  );
});

describe('AlertZeroPublicPlugin attachment UI registration', () => {
  // The registrars use `await import(...)` to keep these renderers out of the initial
  // bundle, so registration is still a floating promise; let it settle before asserting.
  const flushRegistration = () => new Promise((resolve) => setTimeout(resolve, 0));

  const startPlugin = ({
    enabled = true,
    basePath,
    share,
  }: {
    enabled?: boolean;
    basePath?: string;
    share?: SharePluginStart;
  } = {}) => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled })));
    const agentBuilder = agentBuilderMocks.createStart();
    const core = withSetting(coreMock.createStart(), new BehaviorSubject(true));
    if (basePath !== undefined) {
      // `getSpaceIdFromPath` reads the space from what follows `serverBasePath`, so the two
      // must differ the way they do in a real non-default space.
      const mockBasePath = httpServiceMock.createBasePath({ serverBasePath: '' });
      mockBasePath.get.mockReturnValue(basePath);
      // The core start mock types this as the concrete `BasePath` class, but the plugin only
      // reads the `IBasePath` surface the mock implements.
      core.http.basePath = mockBasePath as unknown as typeof core.http.basePath;
    }

    plugin.start(core, {
      licensing: createLicensing(),
      agenticInvestigations: {},
      proposals: {},
      agentBuilder,
      share,
    } as never);

    return agentBuilder;
  };

  it('registers the Hunt Watch attachment types', async () => {
    const { attachments } = startPlugin();
    await flushRegistration();

    expect(attachments.addAttachmentType).toHaveBeenCalledTimes(2);
    expect(attachments.addAttachmentType.mock.calls.map(([type]) => type).sort()).toEqual([
      'security.significant_security_event',
      'security.threat',
    ]);
  });

  it('derives the space id from the base path so registration never waits on a round trip', async () => {
    // A non-default space is carried by the base path as `/s/<id>`, and that id scopes the
    // threat-report lookup, so assert it reaches the ES|QL the action button is built from.
    const locator = { getRedirectUrl: jest.fn().mockReturnValue('/app/discover#/?x=1') };
    const share = {
      url: { locators: { get: jest.fn().mockReturnValue(locator) } },
    } as unknown as SharePluginStart;

    const { attachments } = startPlugin({ basePath: '/s/soc', share });
    await flushRegistration();

    const [, threatDefinition] =
      attachments.addAttachmentType.mock.calls.find(([type]) => type === 'security.threat') ?? [];
    threatDefinition?.getActionButtons?.({
      attachment: { id: 'a-1', type: 'security.threat', data: { report_id: 'report-7' } },
    } as never);

    expect(locator.getRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          esql: expect.stringContaining('space_id IN ("soc", "*")'),
        }),
      })
    );
  });

  it('registers nothing when disabled', async () => {
    const { attachments } = startPlugin({ enabled: false });
    await flushRegistration();

    expect(attachments.addAttachmentType).not.toHaveBeenCalled();
  });
});
