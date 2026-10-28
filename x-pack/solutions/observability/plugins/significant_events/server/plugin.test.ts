/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { knowledgeIndicatorsDataStream } from './lib/knowledge_indicators';
import { detectionsDataStream } from './lib/significant_events/detections';
import type { SignificantEventsPluginSetupDependencies } from './types';
import { SignificantEventsPlugin } from './plugin';

jest.mock('./routes', () => ({ significantEventsRouteRepository: {} }));

const createPlugin = () => new SignificantEventsPlugin(coreMock.createPluginInitializerContext());

const createCoreSetup = () => {
  const core = coreMock.createSetup();
  core.pricing.isFeatureAvailable.mockResolvedValue(false);
  return core;
};

const createSetupDeps = ({
  onSourceChange = jest.fn(),
  workflowsExtensions,
}: {
  onSourceChange?: jest.Mock;
  workflowsExtensions?: {
    registerStepDefinition: jest.Mock;
    registerManagedWorkflowOwner: jest.Mock;
    registerTriggerDefinition: jest.Mock;
  };
} = {}) =>
  ({
    nightshiftSources: { onSourceChange },
    ...(workflowsExtensions ? { workflowsExtensions } : {}),
  } as unknown as SignificantEventsPluginSetupDependencies);

describe('SignificantEventsPlugin setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('supports the investigations plugin being absent', () => {
    const plugin = createPlugin();

    expect(() => plugin.setup(createCoreSetup(), createSetupDeps())).not.toThrow();
  });

  it('subscribes to source changes so deletes and toggles reach knowledge right away', () => {
    const onSourceChange = jest.fn();

    createPlugin().setup(createCoreSetup(), createSetupDeps({ onSourceChange }));

    expect(onSourceChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('registers its model resolver when the investigations plugin is absent', () => {
    const workflowsExtensions = {
      registerStepDefinition: jest.fn(),
      registerManagedWorkflowOwner: jest.fn(),
      registerTriggerDefinition: jest.fn(),
    };

    createPlugin().setup(createCoreSetup(), createSetupDeps({ workflowsExtensions }));

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'significantEvents.resolveModel' })
    );
  });

  it('registers all Core data streams', () => {
    const core = createCoreSetup();

    createPlugin().setup(core, createSetupDeps());

    expect(
      core.dataStreams.registerDataStream.mock.calls.map(([definition]) => definition)
    ).toEqual([detectionsDataStream, knowledgeIndicatorsDataStream]);
  });
});

describe('SignificantEventsPlugin alerting v2 rules client', () => {
  it('requests the alerting v2 rules client attributed to nightshift', async () => {
    const getRulesClientWithRequestInSpace = jest.fn().mockResolvedValue({});
    const core = createCoreSetup();
    core.getStartServices.mockResolvedValue([
      coreMock.createStart(),
      {
        inference: { getClient: jest.fn() },
        licensing: {
          getLicense: jest.fn().mockResolvedValue({ getFeature: () => ({ isEnabled: true }) }),
        },
        fieldsMetadata: { getClient: jest.fn().mockResolvedValue({}) },
        nightshiftSources: { getSourcesClient: jest.fn().mockResolvedValue({}) },
        alertingVTwo: { getRulesClientWithRequestInSpace },
      },
      {},
    ] as unknown as Awaited<ReturnType<typeof core.getStartServices>>);
    const plugin = createPlugin();
    plugin.setup(core, createSetupDeps());
    const request = httpServerMock.createKibanaRequest({ spaceId: 'default' });
    const getScopedClients = (
      plugin as unknown as {
        getScopedClients: (params: {
          request: typeof request;
        }) => Promise<{ getSignificantEventsAlertingContext: () => Promise<unknown> }>;
      }
    ).getScopedClients;

    const scoped = await getScopedClients({ request });
    await scoped.getSignificantEventsAlertingContext();

    expect(getRulesClientWithRequestInSpace).toHaveBeenCalledWith(request, 'default', {
      app: 'nightshift',
    });
  });
});
