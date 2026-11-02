/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { BehaviorSubject } from 'rxjs';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { NIGHTSHIFT_INVESTIGATION_LOCATOR_ID } from '../common/locators';
import type { InvestigationQuotaCallback, NightshiftInvestigationsSetupDeps } from './types';
import { NightshiftInvestigationsPlugin } from './plugin';

const createPlugin = (memoryEnabled = false) =>
  new NightshiftInvestigationsPlugin(
    coreMock.createPluginInitializerContext({
      enabled: true,
      sandbox: undefined,
      cortex: { enabled: false },
      decision_trees: { enabled: true },
      memory: { enabled: memoryEnabled },
    })
  );

const createSetupDeps = () =>
  ({
    share: { url: new MockUrlService() },
  } as unknown as NightshiftInvestigationsSetupDeps);

describe('NightshiftInvestigationsPlugin setup', () => {
  it('keeps the assistant connector while registering named investigation targets', async () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const plugin = new NightshiftInvestigationsPlugin(
      coreMock.createPluginInitializerContext({
        enabled: true,
        sandbox: {
          telemetry_connector_id: 'legacy',
          telemetry_targets: { c0: { connector_id: 'c0' }, orca: { connector_id: 'orca' } },
        },
        cortex: { enabled: false },
        decision_trees: { enabled: false },
        memory: { enabled: false },
      })
    );
    plugin.setup(coreMock.createSetup(), {
      ...createSetupDeps(),
      agentBuilder,
      sandbox: { isAvailable: true },
    });

    const connectorsFor = async (id: string): Promise<string[] | undefined> => {
      const definition = agentBuilder.agents.registerType.mock.calls.find(
        ([type]) => type.id === id
      )?.[0];
      if (!definition) throw new Error(`Agent type not registered: ${id}`);
      const { baseConfiguration } = definition;
      const configuration =
        typeof baseConfiguration === 'function'
          ? await baseConfiguration({
              spaceId: 'default',
              request: httpServerMock.createKibanaRequest(),
            })
          : baseConfiguration;
      return configuration.connector_ids;
    };
    await expect(connectorsFor('platform.nightshift.investigation-type')).resolves.toEqual([
      'legacy',
      'c0',
      'orca',
    ]);
    await expect(connectorsFor('platform.nightshift.assistant-type')).resolves.toEqual(['legacy']);
  });

  it('registers the investigation locator on the server', async () => {
    const dependencies = createSetupDeps();
    createPlugin().setup(coreMock.createSetup(), dependencies);
    const locator = dependencies.share.url.locators.get(NIGHTSHIFT_INVESTIGATION_LOCATOR_ID);
    expect(await locator?.getLocation({ investigationId: 'inv/1' })).toEqual({
      app: 'nightshift',
      path: '?investigationId=inv%2F1',
      state: {},
    });
  });

  it('opts in to alert status changes and follows the Nightshift flag', async () => {
    const alerting = alertsMock.createSetup();
    const request = httpServerMock.createKibanaRequest();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const flag$ = new BehaviorSubject(true);
    coreStart.featureFlags.getBooleanValue$.mockImplementation((name) => {
      expect(name).toBe(NIGHTSHIFT_ENABLED_FLAG);
      return flag$;
    });
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    createPlugin().setup(coreSetup, { ...createSetupDeps(), alerting });

    expect(alerting.enableAlertStatusChanged).toHaveBeenCalledTimes(1);
    const [{ isEnabled }] = alerting.enableAlertStatusChanged.mock.calls[0];
    await new Promise(process.nextTick);
    expect(await isEnabled(request)).toBe(true);

    flag$.next(false);
    expect(await isEnabled(request)).toBe(false);
  });

  it('accepts one investigation quota callback', () => {
    const setup = createPlugin().setup(coreMock.createSetup(), createSetupDeps());
    const callback: InvestigationQuotaCallback = jest.fn().mockResolvedValue({ allowed: true });

    expect(() => setup.registerInvestigationQuota(callback)).not.toThrow();
  });

  it('rejects a second investigation quota callback registration', () => {
    const setup = createPlugin().setup(coreMock.createSetup(), createSetupDeps());
    const callback: InvestigationQuotaCallback = jest.fn().mockResolvedValue({ allowed: true });

    setup.registerInvestigationQuota(callback);

    expect(() => setup.registerInvestigationQuota(callback)).toThrow(
      'Investigation quota callback is already registered'
    );
  });

  it('registers investigation steps when Cortex, memory, and decision trees are disabled', () => {
    const registerStepDefinition = jest.fn();
    const dependencies = {
      ...createSetupDeps(),
      workflowsManagement: {},
      workflowsExtensions: {
        registerManagedWorkflowOwner: jest.fn(),
        registerTriggerDefinition: jest.fn(),
        registerStepDefinition,
      },
    } as unknown as NightshiftInvestigationsSetupDeps;

    createPlugin().setup(coreMock.createSetup(), dependencies);

    expect(registerStepDefinition.mock.calls.map(([definition]) => definition.id)).toEqual(
      expect.arrayContaining([
        'nightshift.resolveModel',
        'nightshift.onlineEvals.classifyRound',
        'nightshift.sendNotifications',
        'nightshift.obtainSandbox',
        'nightshift.cortexHydrate',
        'nightshift.memoryMaterializeToSandbox',
        'nightshift.composeHydrateNotifications',
        'nightshift.cortexOptimize',
        'nightshift.memoryOptimize',
      ])
    );
  });
});
