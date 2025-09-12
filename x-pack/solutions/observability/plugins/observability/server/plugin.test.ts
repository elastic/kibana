/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { Subject } from 'rxjs';
import { ObservabilityPlugin } from './plugin';
import {
  setEsqlRecommendedQueries,
  unsetMetricsExperienceEsqlRecommendedQueries,
} from './lib/esql_extensions/set_esql_recommended_queries';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { MockUrlService } from '@kbn/share-plugin/common/mocks';

jest.mock('./lib/esql_extensions/set_esql_recommended_queries', () => ({
  setEsqlRecommendedQueries: jest.fn(),
  unsetMetricsExperienceEsqlRecommendedQueries: jest.fn(),
}));

describe('Observability plugin', () => {
  let subject: Subject<boolean>;
  const coreSetup = coreMock.createSetup();
  const pluginsSetup = {
    alerting: alertsMock.createSetup(),
    features: featuresPluginMock.createSetup(),
    ruleRegistry: jest.fn(),
    share: { url: new MockUrlService() },
  };
  const pluginInitContext = coreMock.createPluginInitializerContext();
  pluginInitContext.config.get.mockReturnValue({ annotations: { enabled: jest.fn() } });

  beforeEach(() => {
    jest.clearAllMocks();

    subject = new Subject<boolean>();
    coreSetup.getStartServices = jest.fn().mockResolvedValue([
      {
        featureFlags: { getBooleanValue$: jest.fn().mockReturnValue(subject) },
        pricing: { isFeatureAvailable: jest.fn() },
      },
      { alerting: jest.fn() },
    ]);
  });

  describe('setup()', () => {
    it('should set and unset recommended queries based on Metrics Experience flag', async () => {
      const plugin = new ObservabilityPlugin(pluginInitContext);
      plugin.setup(coreSetup, pluginsSetup as any);
      await Promise.resolve(); // Let .then() run

      expect(setEsqlRecommendedQueries).not.toHaveBeenCalled();
      subject.next(true); // Enable Metrics Experience feature flag
      expect(setEsqlRecommendedQueries).toHaveBeenCalled();
      subject.next(false); // Disable Metrics Experience feature flag
      expect(unsetMetricsExperienceEsqlRecommendedQueries).toHaveBeenCalled();
    });
  });
  describe('stop()', () => {
    it('should stop emitting feature flag changes after destroy', async () => {
      const plugin = new ObservabilityPlugin(pluginInitContext);
      plugin.setup(coreSetup, pluginsSetup as any);
      await Promise.resolve(); // Let .then() run

      expect(setEsqlRecommendedQueries).toHaveBeenCalledTimes(0);
      subject.next(true); // Enable Metrics Experience feature flag
      expect(setEsqlRecommendedQueries).toHaveBeenCalledTimes(1);
      plugin.stop();
      subject.next(true); // Re-emit feature flag
      expect(setEsqlRecommendedQueries).toHaveBeenCalledTimes(1);
    });
  });
});
