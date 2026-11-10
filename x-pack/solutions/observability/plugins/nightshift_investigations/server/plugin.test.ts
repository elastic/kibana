/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { BehaviorSubject } from 'rxjs';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import {
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { NIGHTSHIFT_INVESTIGATION_LOCATOR_ID } from '../common/locators';
import type {
  InvestigationQuotaCallback,
  NightshiftInvestigationsSetupDeps,
  NightshiftInvestigationsStartDeps,
} from './types';
import { NightshiftInvestigationsPlugin } from './plugin';

const createPlugin = (memoryEnabled = false) =>
  new NightshiftInvestigationsPlugin(
    coreMock.createPluginInitializerContext({
      enabled: true,
      wiki: { enabled: false },
      decision_trees: { enabled: true },
      memory: { enabled: memoryEnabled },
      learning: { enabled: true },
      findings_recorder: { enabled: true },
    })
  );

const createSetupDeps = () =>
  ({
    share: { url: new MockUrlService() },
  } as unknown as NightshiftInvestigationsSetupDeps);

describe('NightshiftInvestigationsPlugin setup', () => {
  it('registers the investigator and the assistant without connectors of their own', async () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const plugin = new NightshiftInvestigationsPlugin(
      coreMock.createPluginInitializerContext({
        enabled: true,
        wiki: { enabled: false },
        decision_trees: { enabled: false },
        memory: { enabled: false },
        learning: { enabled: true },
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
    // Connectors are the ones users assign to the investigator; no setting adds one.
    await expect(connectorsFor('platform.nightshift.investigation-type')).resolves.toEqual([]);
    await expect(connectorsFor('platform.nightshift.assistant-type')).resolves.toEqual([]);
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

  it('registers the reference-free, alert-outcome and Wiki judges with the evals plugin', () => {
    const registerEvaluator = jest.fn();

    createPlugin().setup(coreMock.createSetup(), {
      ...createSetupDeps(),
      evals: { enabled: true, mode: 'runtime', registerTaskProvider: jest.fn(), registerEvaluator },
    });

    expect(registerEvaluator.mock.calls.map(([{ name, version }]) => `${name}@${version}`)).toEqual(
      [
        'nightshift_rca_reward@1.0.0',
        'nightshift_investigation_process@1.0.0',
        'nightshift_conclusion_quality@1.0.0',
        'nightshift_alert_outcome_rca_accuracy@1.0.0',
        'nightshift_alert_outcome_benign_classification@1.0.0',
        'nightshift_wiki_pages_read@1.0.0',
        'nightshift_wiki_page_influence@1.0.0',
      ]
    );
  });

  it('registers investigation steps when Wiki, memory, and decision trees are disabled', () => {
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
        'nightshift.onlineEvals.score',
        'nightshift.sendNotifications',
        'nightshift.obtainSandbox',
        'nightshift.wikiHydrate',
        'nightshift.memoryMaterializeToSandbox',
        'nightshift.composeHydrateNotifications',
        'nightshift.wikiOptimize',
        'nightshift.memoryOptimize',
      ])
    );
  });
});

describe('NightshiftInvestigationsPlugin start', () => {
  /** Starts the plugin with only the given knowledge systems on and returns the workflows it installed. */
  const installedWorkflows = async ({
    wiki = false,
    memory = false,
    decisionTrees = false,
  }: {
    wiki?: boolean;
    memory?: boolean;
    decisionTrees?: boolean;
  }): Promise<string[]> => {
    const plugin = new NightshiftInvestigationsPlugin(
      coreMock.createPluginInitializerContext({
        enabled: true,
        wiki: { enabled: wiki },
        decision_trees: { enabled: decisionTrees },
        memory: { enabled: memory },
        learning: { enabled: true },
        findings_recorder: { enabled: false },
      })
    );
    plugin.setup(coreMock.createSetup(), { ...createSetupDeps(), sandbox: { isAvailable: true } });
    const install = jest.fn().mockResolvedValue(undefined);
    let ready = (): void => {};
    const installed = new Promise<void>((resolve) => {
      ready = resolve;
    });
    plugin.start(coreMock.createStart(), {
      workflowsExtensions: {
        initManagedWorkflowsClient: () => Promise.resolve({ install, ready }),
      },
    } as unknown as NightshiftInvestigationsStartDeps);
    await installed;
    return install.mock.calls.map(([workflowId]) => workflowId);
  };

  const KNOWLEDGE_WORKFLOWS = [
    NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
    NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  ];

  // Decision trees do not require Wiki or Memory, so they alone must install the combined
  // workflows that hydrate and reinforce them.
  it('installs the combined knowledge workflows with only decision trees on', async () => {
    const installed = await installedWorkflows({ decisionTrees: true });
    expect(installed).toEqual(expect.arrayContaining(KNOWLEDGE_WORKFLOWS));
    expect(installed).toContain(NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID);
  });

  it('installs the combined knowledge workflows with only Wiki on', async () => {
    const installed = await installedWorkflows({ wiki: true });
    expect(installed).toEqual(expect.arrayContaining(KNOWLEDGE_WORKFLOWS));
    expect(installed).not.toContain(NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID);
  });

  it('installs no knowledge workflow with every knowledge system off', async () => {
    const installed = await installedWorkflows({});
    for (const workflowId of [...KNOWLEDGE_WORKFLOWS, NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID]) {
      expect(installed).not.toContain(workflowId);
    }
  });
});
