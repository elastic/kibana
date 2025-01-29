/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import http from 'http';

import expect from '@kbn/expect';
import { CaseStatuses, AttachmentType, User } from '@kbn/cases-plugin/common/types/domain';
import { RecordingServiceNowSimulator } from '@kbn/actions-simulators-plugin/server/servicenow_simulation';
import { CaseConnector } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';

import {
  postCaseReq,
  defaultUser,
  postCommentUserReq,
  getPostCaseRequest,
  postCommentAlertReq,
  postCommentActionsReq,
  postCommentActionsReleaseReq,
  postCommentAlertMultipleIdsReq,
  persistableStateAttachment,
  postExternalReferenceESReq,
} from '../../../../common/lib/mock';
import {
  getConfigurationRequest,
  createCase,
  pushCase,
  createComment,
  updateCase,
  deleteAllCaseItems,
  superUserSpace1Auth,
  getConnectorMappingsFromES,
  getCase,
  createConfiguration,
  getSignalsWithES,
  delay,
  calculateDuration,
  getComment,
  bulkCreateAttachments,
  loginUsers,
  setupSuperUserProfile,
  getServiceNowConnector,
  createCaseWithConnector,
  getRecordingServiceNowSimulatorServer,
  getServiceNowSimulationServer,
  createConnector,
} from '../../../../common/lib/api';
import {
  globalRead,
  noCasesConnectors,
  noKibanaPrivileges,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import { arraysToEqual } from '../../../../common/lib/validation';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const security = getService('security');

  describe('push_case', () => {
    describe('incident recorder server', () => {
      const actionsRemover = new ActionsRemover(supertest);
      let serviceNowSimulatorURL: string = '';
      let serviceNowServer: RecordingServiceNowSimulator;

      beforeEach(async () => {
        const { server, url } = await getRecordingServiceNowSimulatorServer();
        serviceNowServer = server;
        serviceNowSimulatorURL = url;
      });

      afterEach(async () => {
        await deleteAllCaseItems(es);
        await actionsRemover.removeAll();
        serviceNowServer.close();
      });

      it('should push a with a description using the updated profile full name', async () => {
        const cookies = await loginUsers({ supertest: supertestWithoutAuth, users: [superUser] });

        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
          auth: null,
          headers: { Cookie: cookies[0].cookieString() },
        });

        // change the super user's full name and email
        await security.user.create(superUser.username, {
          password: superUser.password,
          roles: superUser.roles,
          full_name: 'super_full_name',
          email: 'fullname@super.com',
        });

        // log in again to update the profile
        await loginUsers({ supertest: supertestWithoutAuth, users: [superUser] });

        await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        // the full string should look something like this:
        // This is a brand new case of a bad meanie defacing data.\n\nAdded by super_full_name.
        expect(serviceNowServer.incident?.description).to.contain('by super_full_name');
      });

      it('should map the fields and add the backlink to Kibana correctly', async () => {
        const cookies = await loginUsers({ supertest: supertestWithoutAuth, users: [superUser] });

        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
          auth: null,
          headers: { Cookie: cookies[0].cookieString() },
        });

        await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        expect(serviceNowServer.incident).eql({
          short_description: postedCase.title,
          description: `${postedCase.description}\n\nAdded by super_full_name.\nFor more details, view this case in Kibana.\nCase URL: https://localhost:5601/app/management/insightsAndAlerting/cases/${postedCase.id}`,
          severity: '2',
          urgency: '2',
          impact: '2',
          category: 'software',
          subcategory: 'os',
          correlation_id: postedCase.id,
          correlation_display: 'Elastic Case',
          caller_id: 'admin',
          opened_by: 'admin',
        });
      });

      it('should map the fields and add the backlink with spaceId to Kibana correctly', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
          auth: { user: superUser, space: 'space1' },
        });

        await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
          auth: { user: superUser, space: 'space1' },
        });

        expect(serviceNowServer.incident).eql({
          short_description: postedCase.title,
          description: `${postedCase.description}\n\nAdded by elastic.\nFor more details, view this case in Kibana.\nCase URL: https://localhost:5601/s/space1/app/management/insightsAndAlerting/cases/${postedCase.id}`,
          severity: '2',
          urgency: '2',
          impact: '2',
          category: 'software',
          subcategory: 'os',
          correlation_id: postedCase.id,
          correlation_display: 'Elastic Case',
          caller_id: 'admin',
          opened_by: 'admin',
        });
      });

      it('should format the comments correctly', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });

        const patchedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            postCommentUserReq,
            postCommentAlertReq,
            postCommentAlertMultipleIdsReq,
            postCommentActionsReq,
            postCommentActionsReleaseReq,
            postExternalReferenceESReq,
            persistableStateAttachment,
          ],
        });

        await pushCase({
          supertest,
          caseId: patchedCase.id,
          connectorId: connector.id,
        });

        /**
         * If the request contains the work_notes property then
         * it is a create comment request
         */
        const allCommentRequests = serviceNowServer.allRequestData.filter((request) =>
          Boolean(request.work_notes)
        );

        const allWorkNotes = allCommentRequests.map((request) => request.work_notes);
        const expectedNotes = [
          'This is a cool comment\n\nAdded by elastic.',
          'Isolated host host-name with comment: comment text\n\nAdded by elastic.',
          'Released host host-name with comment: comment text\n\nAdded by elastic.',
          `Elastic Alerts attached to the case: 3\n\nFor more details, view the alerts in Kibana\nAlerts URL: https://localhost:5601/app/management/insightsAndAlerting/cases/${patchedCase.id}/?tabId=alerts`,
        ];

        /**
         * For each of these comments a request is made:
         * postCommentUserReq, postCommentActionsReq, postCommentActionsReleaseReq, and a comment with the
         * total alerts attach to a case. All other type of comments should be filtered. Specifically,
         * postCommentAlertReq, postCommentAlertMultipleIdsReq, postExternalReferenceESReq, and persistableStateAttachment
         */
        expect(allCommentRequests.length).be(4);

        // since we're using a bulk create we can't guarantee the ordering so we'll check that the values exist but not
        // there specific order in the results
        expect(arraysToEqual(allWorkNotes, expectedNotes)).to.be(true);
      });

      it('should format the totalAlerts with spaceId correctly', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
          auth: { user: superUser, space: 'space1' },
        });

        const patchedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postCommentAlertReq, postCommentAlertMultipleIdsReq],
          auth: { user: superUser, space: 'space1' },
        });

        await pushCase({
          supertest,
          caseId: patchedCase.id,
          connectorId: connector.id,
          auth: { user: superUser, space: 'space1' },
        });

        /**
         * If the request contains the work_notes property then
         * it is a create comment request
         */
        const allCommentRequests = serviceNowServer.allRequestData.filter((request) =>
          Boolean(request.work_notes)
        );

        expect(allCommentRequests.length).be(1);
        expect(allCommentRequests[0].work_notes).eql(
          `Elastic Alerts attached to the case: 3\n\nFor more details, view the alerts in Kibana\nAlerts URL: https://localhost:5601/s/space1/app/management/insightsAndAlerting/cases/${patchedCase.id}/?tabId=alerts`
        );
      });
    });

    describe('memoryless server', () => {
      const actionsRemover = new ActionsRemover(supertest);
      let serviceNowSimulatorURL: string = '';
      let serviceNowServer: http.Server;

      before(async () => {
        const { server, url } = await getServiceNowSimulationServer();
        serviceNowServer = server;
        serviceNowSimulatorURL = url;
      });

      afterEach(async () => {
        await deleteAllCaseItems(es);
        await actionsRemover.removeAll();
      });

      after(async () => {
        serviceNowServer.close();
      });

      it('should push a case', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });
        const theCase = await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        const { pushed_at, external_url, ...rest } = theCase.external_service!;

        expect(rest).to.eql({
          pushed_by: defaultUser,
          connector_id: connector.id,
          connector_name: connector.name,
          external_id: '123',
          external_title: 'INC01',
        });

        expect(external_url.includes('nav_to.do?uri=incident.do?sys_id=123')).to.equal(true);
      });

      it('preserves the connector.id after pushing a case', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });
        const theCase = await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        expect(theCase.connector.id).to.eql(connector.id);
      });

      it('preserves the external_service.connector_id after updating the connector', async () => {
        const { postedCase, connector: pushConnector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });

        const theCaseAfterPush = await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: pushConnector.id,
        });

        const newConnector = await createConnector({
          supertest,
          req: {
            ...getServiceNowConnector(),
            config: { apiUrl: serviceNowSimulatorURL },
          },
        });

        actionsRemover.add('default', newConnector.id, 'connector', 'actions');
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: theCaseAfterPush.version,
                connector: {
                  id: newConnector.id,
                  name: newConnector.name,
                  type: newConnector.connector_type_id,
                  fields: {
                    urgency: '2',
                    impact: '2',
                    severity: '2',
                    category: 'software',
                    subcategory: 'os',
                  },
                } as CaseConnector,
              },
            ],
          },
        });

        const theCaseAfterUpdate = await getCase({ supertest, caseId: postedCase.id });
        expect(theCaseAfterUpdate.connector.id).to.eql(newConnector.id);
        expect(theCaseAfterUpdate.external_service?.connector_id).to.eql(pushConnector.id);
      });

      it('should push to a connector without mapping', async () => {
        // create a connector but not a configuration so that the mapping will not be present
        const connector = await createConnector({
          supertest,
          req: {
            ...getServiceNowConnector(),
            config: { apiUrl: serviceNowSimulatorURL },
          },
        });

        actionsRemover.add('default', connector.id, 'connector', 'actions');

        const postedCase = await createCase(
          supertest,
          {
            ...getPostCaseRequest(),
            connector: {
              id: connector.id,
              name: connector.name,
              type: connector.connector_type_id,
              fields: {
                urgency: '2',
                impact: '2',
                severity: '2',
                category: 'software',
                subcategory: 'os',
              },
            } as CaseConnector,
          },
          200
        );

        // there should be no mappings initially
        const mappings = await getConnectorMappingsFromES({ es });
        expect(mappings.body.hits.hits.length).to.eql(0);

        await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });
      });

      it('pushes a comment appropriately', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });
        await createComment({ supertest, caseId: postedCase.id, params: postCommentUserReq });
        const theCase = await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        expect(theCase.comments![0].pushed_by).to.eql(defaultUser);
      });

      it('should pushes a case and closes when closure_type: close-by-pushing', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          configureReq: {
            closure_type: 'close-by-pushing',
          },
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });
        const theCase = await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        expect(theCase.status).to.eql('closed');
      });

      it('unhappy path - 404s when case does not exist', async () => {
        await pushCase({
          supertest,
          caseId: 'fake-id',
          connectorId: 'fake-connector',
          expectedHttpCode: 404,
        });
      });

      it('unhappy path - 404s when connector does not exist', async () => {
        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          connector: getConfigurationRequest().connector,
        });
        await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: 'fake-connector',
          expectedHttpCode: 404,
        });
      });

      it('should push a closed case', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
              },
            ],
          },
        });

        await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
          expectedHttpCode: 200,
        });
      });

      // FLAKY: https://github.com/elastic/kibana/issues/157588
      describe.skip('user profile uid', () => {
        let headers: Record<string, string>;
        let superUserWithProfile: User;
        let superUserInfo: User;

        before(async () => {
          ({ headers, superUserInfo, superUserWithProfile } = await setupSuperUserProfile(
            getService
          ));
        });

        it('sets the closed by profile uid in the case and comment', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest: supertestWithoutAuth,
            serviceNowSimulatorURL,
            actionsRemover,
            auth: null,
            headers,
          });

          const patchedCase = await createComment({
            supertest,
            caseId: postedCase.id,
            params: postCommentUserReq,
          });

          const pushedCase = await pushCase({
            supertest: supertestWithoutAuth,
            caseId: patchedCase.id,
            connectorId: connector.id,
            auth: null,
            headers,
          });

          const pushedComment = await getComment({
            supertest,
            caseId: patchedCase.id,
            commentId: patchedCase.comments![0].id,
          });

          expect(pushedCase.external_service?.pushed_by).to.eql(superUserWithProfile);
          expect(pushedComment.pushed_by).to.eql(superUserWithProfile);
        });

        it('falls back to authc to get the user information when the profile uid is not available', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest: supertestWithoutAuth,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          const patchedCase = await createComment({
            supertest,
            caseId: postedCase.id,
            params: postCommentUserReq,
          });

          const theCase = await pushCase({
            supertest: supertestWithoutAuth,
            caseId: patchedCase.id,
            connectorId: connector.id,
          });

          const pushedComment = await getComment({
            supertest,
            caseId: patchedCase.id,
            commentId: patchedCase.comments![0].id,
          });

          expect(theCase.external_service?.pushed_by).to.eql(superUserInfo);
          expect(pushedComment.pushed_by).to.eql(superUserInfo);
        });
      });

      describe('duration', () => {
        it('updates the duration correctly when pushed a case and case closure options is set to automatically', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            configureReq: {
              closure_type: 'close-by-pushing',
            },
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          await delay(1000);

          const pushedCase = await pushCase({
            supertest,
            caseId: postedCase.id,
            connectorId: connector.id,
          });

          const duration = calculateDuration(pushedCase.closed_at, postedCase.created_at);
          expect(duration).to.be(pushedCase.duration);
        });
      });

      describe('alerts', () => {
        const defaultSignalsIndex = 'siem-signals-default-000001';
        const signalID = '4679431ee0ba3209b6fcd60a255a696886fe0a7d18f5375de510ff5b68fa6b78';
        const signalID2 = '1023bcfea939643c5e51fd8df53797e0ea693cee547db579ab56d96402365c1e';

        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/default');
        });

        afterEach(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/default');
          await deleteAllCaseItems(es);
        });

        const attachAlertsAndPush = async ({
          syncAlerts = true,
        }: { syncAlerts?: boolean } = {}) => {
          const { postedCase, connector } = await createCaseWithConnector({
            createCaseReq: { ...getPostCaseRequest(), settings: { syncAlerts } },
            configureReq: {
              closure_type: 'close-by-pushing',
            },
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: signalID,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          await es.indices.refresh({ index: defaultSignalsIndex });

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: signalID2,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          await es.indices.refresh({ index: defaultSignalsIndex });

          await pushCase({
            supertest,
            caseId: postedCase.id,
            connectorId: connector.id,
          });

          await es.indices.refresh({ index: defaultSignalsIndex });

          const signals = await getSignalsWithES({
            es,
            indices: defaultSignalsIndex,
            ids: [signalID, signalID2],
          });

          return signals;
        };

        it('should change the status of all alerts attached to a case to closed when closure_type: close-by-pushing and syncAlerts: true', async () => {
          const signals = await attachAlertsAndPush();
          /**
           * The status of the alerts should be changed to closed when pushing a case and the
           * closure_type is set to close-by-pushing
           */
          expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal?.status).to.be(
            CaseStatuses.closed
          );

          expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal?.status).to.be(
            CaseStatuses.closed
          );
        });

        it('should NOT change the status of all alerts attached to a case to closed when closure_type: close-by-pushing and syncAlerts: false', async () => {
          const signals = await attachAlertsAndPush({ syncAlerts: false });
          /**
           * The status of the alerts should NOT be changed to closed when pushing a case and the
           * closure_type is set to close-by-pushing and syncAlert is set to false
           */
          expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal?.status).to.be(
            CaseStatuses.open
          );

          expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal?.status).to.be(
            CaseStatuses.open
          );
        });
      });

      describe('rbac', () => {
        it('should push a case that the user has permissions for', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest: supertestWithoutAuth,
            serviceNowSimulatorURL,
            actionsRemover,
            auth: superUserSpace1Auth,
          });

          await pushCase({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            connectorId: connector.id,
            auth: { user: secOnly, space: 'space1' },
          });
        });

        it('should not push a case that the user does not have permissions for', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest: supertestWithoutAuth,
            serviceNowSimulatorURL,
            actionsRemover,
            auth: superUserSpace1Auth,
            createCaseReq: getPostCaseRequest({ owner: 'observabilityFixture' }),
          });

          await pushCase({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            connectorId: connector.id,
            auth: { user: secOnly, space: 'space1' },
            expectedHttpCode: 403,
          });
        });

        for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
          it(`User ${
            user.username
          } with role(s) ${user.roles.join()} - should NOT push a case`, async () => {
            const { postedCase, connector } = await createCaseWithConnector({
              supertest: supertestWithoutAuth,
              serviceNowSimulatorURL,
              actionsRemover,
              auth: superUserSpace1Auth,
            });

            await pushCase({
              supertest: supertestWithoutAuth,
              caseId: postedCase.id,
              connectorId: connector.id,
              auth: { user, space: 'space1' },
              expectedHttpCode: 403,
            });
          });
        }

        it('should not push a case in a space that the user does not have permissions for', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest: supertestWithoutAuth,
            serviceNowSimulatorURL,
            actionsRemover,
            auth: { user: superUser, space: 'space2' },
          });

          await pushCase({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            connectorId: connector.id,
            auth: { user: secOnly, space: 'space2' },
            expectedHttpCode: 403,
          });
        });

        it('should respect closure options of the current owner when pushing', async () => {
          await createConfiguration(
            supertestWithoutAuth,
            {
              ...getConfigurationRequest(),
              owner: 'securitySolutionFixture',
              closure_type: 'close-by-user',
            },
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          await createConfiguration(
            supertestWithoutAuth,
            {
              ...getConfigurationRequest(),
              owner: 'observabilityFixture',
              closure_type: 'close-by-pushing',
            },
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          const { postedCase, connector } = await createCaseWithConnector({
            supertest: supertestWithoutAuth,
            serviceNowSimulatorURL,
            actionsRemover,
            auth: { user: superUser, space: 'space1' },
          });

          await pushCase({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            connectorId: connector.id,
            auth: { user: superUser, space: 'space1' },
          });

          const theCase = await getCase({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user: superUser, space: 'space1' },
          });

          expect(theCase.status).to.eql('open');
        });

        it('should return 403 when the user does not have access to push', async () => {
          const { postedCase } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
            configureReq: { owner: 'testNoCasesConnectorFixture' },
            createCaseReq: { ...getPostCaseRequest(), owner: 'testNoCasesConnectorFixture' },
          });

          await pushCase({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            connectorId: postedCase.connector.id,
            expectedHttpCode: 403,
            auth: { user: noCasesConnectors, space: null },
          });
        });
      });
    });
  });
};
