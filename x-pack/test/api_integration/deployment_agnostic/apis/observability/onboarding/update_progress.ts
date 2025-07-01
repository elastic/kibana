/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '@kbn/observability-onboarding-plugin/server/saved_objects/observability_onboarding_status';
import { type DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { type SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let adminClient: SupertestWithRoleScopeType;
  let adminClientWithAPIKey: SupertestWithRoleScopeType;

  describe('Update step progress', () => {
    before(async () => {
      adminClient = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
      adminClientWithAPIKey = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
      });
    });

    after(async () => {
      await adminClientWithAPIKey.destroy();
    });

    describe("when onboardingId doesn't exists", () => {
      it('fails with a 404 error', async () => {
        const response = await adminClient
          .post(`/internal/observability_onboarding/flow/test-onboarding-id/step/ea-download`)
          .send({
            status: 'complete',
          });

        expect(response.status).to.be(404);
        expect(response.body.message).to.contain('onboarding session not found');
      });
    });

    describe('when onboardingId exists', () => {
      let onboardingId: string;

      beforeEach(async () => {
        const createFlowResponse = await adminClient.post(
          '/internal/observability_onboarding/flow'
        );

        onboardingId = createFlowResponse.body.onboardingFlow.id;

        const savedState = await kibanaServer.savedObjects.get({
          type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
          id: onboardingId,
        });

        expect(savedState.attributes.progress).eql({});
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.delete({
          type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
          id: onboardingId,
        });
      });

      it('updates step status', async () => {
        const step = {
          name: 'ea-download',
          status: 'complete',
        };

        const response = await adminClientWithAPIKey
          .post(`/internal/observability_onboarding/flow/${onboardingId}/step/${step.name}`)
          .send({
            status: step.status,
          });

        expect(response.status).to.be(200);

        const savedState = await kibanaServer.savedObjects.get({
          type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
          id: onboardingId,
        });

        const stepProgress = savedState.attributes.progress?.[step.name];
        expect(stepProgress).to.have.property('status', step.status);
      });

      it('updates step status with message', async () => {
        const message = 'Download failed';
        const step = {
          name: 'ea-download',
          status: 'danger',
          message: Buffer.from(message, 'utf8').toString('base64'),
        };
        const response = await adminClientWithAPIKey
          .post(`/internal/observability_onboarding/flow/${onboardingId}/step/${step.name}`)
          .send({
            status: step.status,
            message: step.message,
          });

        expect(response.status).to.be(200);

        const savedState = await kibanaServer.savedObjects.get({
          type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
          id: onboardingId,
        });

        const stepProgress = savedState.attributes.progress?.[step.name];
        expect(stepProgress).to.have.property('status', step.status);
        expect(stepProgress).to.have.property('message', message);
      });
    });
  });
}
