/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, PluginInitializerContext } from '@kbn/core/server';
import type { SignalAnalyzer } from '@kbn/signal-investigation-contract';
import { MetricsDataPlugin } from '../plugin';
import type { MetricsDataPluginSetupDeps, MetricsDataPluginStartDeps } from '../types';

const createMockCore = (): CoreSetup<MetricsDataPluginStartDeps> =>
  ({
    http: {
      createRouter: () => ({
        post: jest.fn(),
        get: jest.fn(),
        put: jest.fn(),
      }),
    },
    savedObjects: {
      registerType: jest.fn(),
    },
    getStartServices: jest.fn(),
  } as unknown as CoreSetup<MetricsDataPluginStartDeps>);

const createPlugin = (): MetricsDataPlugin =>
  new MetricsDataPlugin({} as unknown as PluginInitializerContext);

describe('MetricsDataPlugin signal investigation registration', () => {
  it('registers metric_change_points with es_delegated authz when signalInvestigation is present', () => {
    const registered: SignalAnalyzer[] = [];
    const deps: MetricsDataPluginSetupDeps = {
      signalInvestigation: {
        registerAnalyzer: (analyzer) => {
          registered.push(analyzer);
        },
      },
    };

    const setup = createPlugin().setup(createMockCore(), deps);

    expect(setup.client).toBeDefined();
    expect(registered.map(({ id, authz }) => ({ id, authz }))).toEqual([
      {
        id: 'metric_change_points',
        authz: 'es_delegated',
      },
    ]);
  });

  it('sets up cleanly when signalInvestigation is absent', () => {
    const setup = createPlugin().setup(createMockCore(), {});
    expect(setup.client).toBeDefined();
  });
});
