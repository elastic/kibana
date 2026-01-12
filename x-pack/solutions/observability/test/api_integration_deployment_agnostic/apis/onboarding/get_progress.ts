/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { type LogsSynthtraceEsClient } from '@kbn/synthtrace';
import { log, timerange } from '@kbn/synthtrace-client';
import { type DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { type RoleCredentials, type SupertestWithRoleScopeType } from '../../services';
import { customRoles } from './custom_roles';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const customRoleScopedSupertest = getService('customRoleScopedSupertest');
  const saml = getService('samlAuth');
  const synthtrace = getService('synthtrace');

  let synthtraceLogsEsClient: LogsSynthtraceEsClient;
  let adminClient: SupertestWithRoleScopeType;

  describe('Get progress', () => {
    const datasetName = 'api-tests';
    const namespace = 'default';
    let onboardingId: string;

    before(async () => {
      synthtraceLogsEsClient = await synthtrace.createLogsSynthtraceEsClient();
      adminClient = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });

      const createFlowResponse = await adminClient.post('/internal/observability_onboarding/flow');

      onboardingId = createFlowResponse.body.onboardingFlow.id;
    });

    it(`fails with a 404 error when onboardingId doesn't exists`, async () => {
      const response = await adminClient.get(
        `/internal/observability_onboarding/flow/test-onboarding-id/progress`
      );

      expect(response.status).to.be(404);
      expect(response.body.message).to.contain('onboarding session not found');
    });

    describe('when user lacks required privileges', () => {
      let noAccessClient: SupertestWithRoleScopeType;
      let roleAuthc: RoleCredentials;

      before(async () => {
        await saml.setCustomRole(customRoles.noAccessUserRole);
        noAccessClient = await customRoleScopedSupertest.getSupertestWithCustomRoleScope({
          useCookieHeader: true,
          withInternalHeaders: true,
        });
        roleAuthc = await saml.createM2mApiKeyWithCustomRoleScope();
      });

      after(async () => {
        await saml.invalidateM2mApiKeyWithRoleScope(roleAuthc);
        await saml.deleteCustomRole();
      });

      it('fails with a 404 error', async () => {
        const response = await noAccessClient.get(
          `/internal/observability_onboarding/flow/${onboardingId}/progress`
        );

        expect(response.status).to.be(404);
        expect(response.body.message).to.contain('onboarding session not found');
      });
    });

    describe('when ea-status is complete', () => {
      describe('should not skip logs verification', () => {
        const agentId = 'my-agent-id';

        before(async () => {
          await adminClient
            .post(`/internal/observability_onboarding/flow/${onboardingId}/step/ea-status`)
            .send({
              status: 'complete',
              payload: {
                agentId,
              },
            });
        });

        describe('when no logs have been ingested', () => {
          it('should return log-ingest as loading', async () => {
            const response = await adminClient.get(
              `/internal/observability_onboarding/flow/${onboardingId}/progress`
            );

            expect(response.status).to.be(200);

            const logsIngestProgress = response.body.progress['logs-ingest'];
            expect(logsIngestProgress).to.have.property('status', 'loading');
          });
        });

        describe('when logs have been ingested', () => {
          describe('with a different agentId', () => {
            describe('and onboarding type is logFiles', () => {
              before(async () => {
                await synthtraceLogsEsClient.index([
                  timerange('2023-11-20T10:00:00.000Z', '2023-11-20T10:01:00.000Z')
                    .interval('1m')
                    .rate(1)
                    .generator((timestamp) =>
                      log
                        .create()
                        .message('This is a log message')
                        .timestamp(timestamp)
                        .dataset(datasetName)
                        .namespace(namespace)
                        .service('my-service')
                        .defaults({
                          'agent.id': 'another-agent-id',
                          'log.file.path': '/my-service.log',
                        })
                    ),
                ]);
              });

              it('should return log-ingest as incomplete', async () => {
                const response = await adminClient.get(
                  `/internal/observability_onboarding/flow/${onboardingId}/progress`
                );
                expect(response.status).to.be(200);
                const logsIngestProgress = response.body.progress['logs-ingest'];
                expect(logsIngestProgress).to.have.property('status', 'loading');
              });

              after(async () => {
                await synthtraceLogsEsClient.clean();
              });
            });
          });

          describe('with the expected agentId', () => {
            describe('and onboarding type is logFiles', () => {
              before(async () => {
                await synthtraceLogsEsClient.index([
                  timerange('2023-11-20T10:00:00.000Z', '2023-11-20T10:01:00.000Z')
                    .interval('1m')
                    .rate(1)
                    .generator((timestamp) =>
                      log
                        .create()
                        .message('This is a log message')
                        .timestamp(timestamp)
                        .dataset(datasetName)
                        .namespace(namespace)
                        .service('my-service')
                        .defaults({
                          'agent.id': agentId,
                          'log.file.path': '/my-service.log',
                        })
                    ),
                ]);
              });
              it('should return log-ingest as complete', async () => {
                const response = await adminClient.get(
                  `/internal/observability_onboarding/flow/${onboardingId}/progress`
                );
                expect(response.status).to.be(200);
                const logsIngestProgress = response.body.progress['logs-ingest'];
                expect(logsIngestProgress).to.have.property('status', 'complete');
              });

              after(async () => {
                await synthtraceLogsEsClient.clean();
              });
            });
          });
        });
      });
    });
  });
}
