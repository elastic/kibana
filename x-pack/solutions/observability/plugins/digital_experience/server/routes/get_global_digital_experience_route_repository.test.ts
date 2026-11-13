/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getGlobalDigitalExperienceServerRouteRepository } from './get_global_digital_experience_route_repository';

describe('digital experience route repository', () => {
  const routes = Object.entries(getGlobalDigitalExperienceServerRouteRepository());

  it('has routes', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  // Calls the handlers directly: over HTTP, authz and param validation run before this guard.
  it.each(routes)(
    '%s handler answers 404 when the feature flag is off',
    async (_endpoint, route) => {
      const getBooleanValue = jest.fn().mockResolvedValue(false);
      const resources = {
        logger: loggingSystemMock.createLogger(),
        context: { core: Promise.resolve({ featureFlags: { getBooleanValue } }) },
      };
      const handler = route.handler as unknown as (resources: unknown) => Promise<unknown>;

      await expect(handler(resources)).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 404 },
      });
      expect(getBooleanValue).toHaveBeenCalledWith('digitalExperience.enabled', false);
    }
  );
});
