/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { type DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { type SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let viewerClientWithAPIKey: SupertestWithRoleScopeType;
  let adminClientWithAPIKey: SupertestWithRoleScopeType;

  describe('Api Key privileges check', () => {
    before(async () => {
      viewerClientWithAPIKey = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
        withInternalHeaders: true,
      });
      adminClientWithAPIKey = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
      });
    });

    after(async () => {
      await viewerClientWithAPIKey.destroy();
      await adminClientWithAPIKey.destroy();
    });

    it('returns false when user has reader privileges', async () => {
      const response = await viewerClientWithAPIKey.get(
        `/internal/observability_onboarding/logs/setup/privileges`
      );

      expect(response.body.hasPrivileges).not.ok();
    });

    it('returns true when user has admin privileges', async () => {
      const response = await adminClientWithAPIKey.get(
        `/internal/observability_onboarding/logs/setup/privileges`
      );

      expect(response.body.hasPrivileges).ok();
    });
  });
}
