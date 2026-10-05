/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { mergeKibanaServices } from './kibana_services';

const pluginSecurity = {
  authc: { getCurrentUser: jest.fn() },
} as unknown as SecurityPluginStart;

describe('mergeKibanaServices', () => {
  it('returns core service accounts when the security plugin start replaces security', () => {
    const core = coreMock.createStart();

    const merged = mergeKibanaServices(core, {
      agentBuilder: {} as never,
      security: pluginSecurity,
    });

    expect(merged.security.serviceAccounts).toBe(core.security.serviceAccounts);
  });

  it('returns the security plugin authc', () => {
    const merged = mergeKibanaServices(coreMock.createStart(), {
      agentBuilder: {} as never,
      security: pluginSecurity,
    });

    expect(merged.security.authc).toBe(pluginSecurity.authc);
  });
});
