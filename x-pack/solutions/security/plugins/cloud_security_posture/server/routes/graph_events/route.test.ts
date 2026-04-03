/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { defineGraphEventsRoute } from './route';

describe('defineGraphEventsRoute', () => {
  it('registers the route with the securitySolution privilege', () => {
    const router = httpServiceMock.createRouter();

    defineGraphEventsRoute(router as any);

    const [config] = router.versioned.post.mock.calls[0];
    const authz = config.security?.authz;

    expect(config.path).toBe('/internal/cloud_security_posture/graph/events');
    expect(authz && 'requiredPrivileges' in authz ? authz.requiredPrivileges : undefined).toEqual([
      'securitySolution',
    ]);
  });
});
