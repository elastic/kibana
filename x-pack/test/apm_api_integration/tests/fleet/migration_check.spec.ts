/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createAgentPolicy,
  createPackagePolicy,
  deleteAgentPolicy,
  deletePackagePolicy,
  setupFleet,
} from './helpers';
import { getBettertest } from '../../common/bettertest';

export default function ApiTest(ftrProviderContext: FtrProviderContext) {
  const { getService } = ftrProviderContext;
  const registry = getService('registry');
  const supertest = getService('supertest');
  const bettertest = getBettertest(supertest);
  const apmApiClient = getService('apmApiClient');

  registry.when('Fleet migration check - basic', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await setupFleet(bettertest);
    });

    describe('cloud_apm_migration_enabled', () => {
      it('should be false when when config not set', async () => {
        const { body } = await bettertest({
          pathname: '/internal/apm/fleet/migration_check',
        });
        expect(body).to.have.property('cloud_apm_migration_enabled', false);
      });
    });
  });

  registry.when('Fleet migration check - cloud', { config: 'cloud', archives: [] }, () => {
    before(async () => {
      await setupFleet(bettertest);
    });

    describe('migration check properties', () => {
      it('should contain all expected properties', async () => {
        const { status, body } = await bettertest({
          pathname: '/internal/apm/fleet/migration_check',
        });
        expect(status).to.equal(200);
        expect(body).to.have.property('has_cloud_agent_policy');
        expect(body).to.have.property('has_cloud_apm_package_policy');
        expect(body).to.have.property('cloud_apm_migration_enabled');
        expect(body).to.have.property('has_required_role');
        expect(body).to.have.property('has_apm_integrations');
        expect(body).to.have.property('latest_apm_package_version');
      });
    });

    describe('cloud_apm_migration_enabled', () => {
      it('should be true when when config is set', async () => {
        const { body } = await bettertest({
          pathname: '/internal/apm/fleet/migration_check',
        });
        expect(body).to.have.property('cloud_apm_migration_enabled', true);
      });
    });

    describe('has_cloud_agent_policy', () => {
      it('should be false when cloud agent policy does not exist', async () => {
        const { body } = await bettertest({
          pathname: '/internal/apm/fleet/migration_check',
        });
        expect(body).to.have.property('has_cloud_agent_policy', false);
      });
      describe('with Cloud agent policy', () => {
        before(async () => {
          await createAgentPolicy({ bettertest, id: 'policy-elastic-agent-on-cloud' });
        });
        after(async () => {
          await deleteAgentPolicy(bettertest, 'policy-elastic-agent-on-cloud');
        });
        it('should be true when cloud agent policy exists', async () => {
          const { body } = await bettertest({
            pathname: '/internal/apm/fleet/migration_check',
          });
          expect(body).to.have.property('has_cloud_agent_policy', true);
        });
      });
    });

    describe('has_cloud_apm_package_policy', () => {
      before(async () => {
        await createAgentPolicy({ bettertest, id: 'policy-elastic-agent-on-cloud' });
      });
      after(async () => {
        await deleteAgentPolicy(bettertest, 'policy-elastic-agent-on-cloud');
      });
      it('should be false when the Cloud APM package policy does not exist', async () => {
        const { body } = await bettertest({
          pathname: '/internal/apm/fleet/migration_check',
        });
        expect(body).to.have.property('has_cloud_apm_package_policy', false);
        expect(body).to.not.have.property('cloud_apm_package_policy');
        expect(body).to.have.property('has_apm_integrations', false);
      });
      describe('with Cloud APM package policy', () => {
        before(async () => {
          await createPackagePolicy({
            bettertest,
            agentPolicyId: 'policy-elastic-agent-on-cloud',
            id: 'apm',
          });
        });
        after(async () => {
          await deletePackagePolicy(bettertest, 'apm');
        });
        it('should be true when the Cloud APM package policy exists', async () => {
          const { body } = await bettertest({
            pathname: '/internal/apm/fleet/migration_check',
          });
          expect(body).to.have.property('has_cloud_apm_package_policy', true);
          expect(body).to.have.property('cloud_apm_package_policy');
          expect(body).to.have.property('has_apm_integrations', true);
        });
      });
    });

    describe('has_apm_integrations', () => {
      before(async () => {
        await createAgentPolicy({ bettertest, id: 'test-agent-policy' });
      });
      after(async () => {
        await deleteAgentPolicy(bettertest, 'test-agent-policy');
      });
      it('should be false when no APM package policies exist', async () => {
        const { body } = await bettertest({
          pathname: '/internal/apm/fleet/migration_check',
        });
        expect(body).to.have.property('has_apm_integrations', false);
        expect(body).to.have.property('has_cloud_apm_package_policy', false);
      });
      describe('with custom APM package policy', () => {
        before(async () => {
          await createPackagePolicy({
            bettertest,
            agentPolicyId: 'test-agent-policy',
            id: 'test-apm-package-policy',
          });
        });
        after(async () => {
          await deletePackagePolicy(bettertest, 'test-apm-package-policy');
        });
        it('should be true when any APM package policy exists', async () => {
          const { body } = await bettertest({
            pathname: '/internal/apm/fleet/migration_check',
          });
          expect(body).to.have.property('has_apm_integrations', true);
          expect(body).to.have.property('has_cloud_apm_package_policy', false);
        });
      });
    });

    describe('has_required_role', () => {
      it('should be true when user is superuser', async () => {
        const { body } = await bettertest({
          pathname: '/internal/apm/fleet/migration_check',
        });
        expect(body).to.have.property('has_required_role', true);
      });
      it('should be false when user is not superuser', async () => {
        const { body } = await apmApiClient.manageServiceAccount({
          endpoint: 'GET /internal/apm/fleet/migration_check',
        });
        expect(body).to.have.property('has_required_role', false);
      });
    });
  });
}
