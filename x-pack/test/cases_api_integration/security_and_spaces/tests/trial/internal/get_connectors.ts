/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import expect from '@kbn/expect';

import { ActionTypes, CaseSeverity, ConnectorTypes } from '@kbn/cases-plugin/common/api';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  getCaseUserActions,
  pushCase,
  updateCase,
} from '../../../../common/lib/utils';
import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCaseWithConnector,
  createConnector,
  getConnectors,
  getJiraConnector,
  getServiceNowConnector,
  getServiceNowSimulationServer,
} from '../../../../common/lib/connectors';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const actionsRemover = new ActionsRemover(supertest);

  describe('get_connectors', () => {
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

    it('does not return the connectors for a case that does not have connectors', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());

      const connectors = await getConnectors({ caseId: postedCase.id, supertest });
      expect(Object.keys(connectors).length).to.be(0);
    });

    it('retrieves multiple connectors', async () => {
      const [{ postedCase, connector: serviceNowConnector }, jiraConnector] = await Promise.all([
        createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        }),
        createConnector({
          supertest,
          req: {
            ...getJiraConnector(),
          },
        }),
      ]);

      actionsRemover.add('default', jiraConnector.id, 'action', 'actions');

      const theCase = await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: serviceNowConnector.id,
      });

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              connector: {
                id: jiraConnector.id,
                name: 'Jira',
                type: ConnectorTypes.jira,
                fields: { issueType: 'Task', priority: null, parent: null },
              },
            },
          ],
        },
      });

      const connectors = await getConnectors({ caseId: theCase.id, supertest });
      expect(Object.keys(connectors).length).to.be(2);
      expect(connectors[serviceNowConnector.id].id).to.be(serviceNowConnector.id);
      expect(connectors[jiraConnector.id].id).to.be(jiraConnector.id);
    });

    describe('retrieving fields', () => {
      it('retrieves a single connector using the create case user action', async () => {
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

        const connectors = await getConnectors({ caseId: theCase.id, supertest });
        const snConnector = connectors[connector.id];

        expect(Object.keys(connectors).length).to.be(1);
        expect(connectors[connector.id].fields).to.eql({
          category: 'software',
          impact: '2',
          severity: '2',
          subcategory: 'os',
          urgency: '2',
        });

        expect(snConnector.needsToBePushed).to.be(false);
        expect(snConnector.name).to.be('ServiceNow Connector');
        expect(snConnector.id).to.be(connector.id);
      });

      it('retrieves a single connector using the connector user action', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const jiraConnector = await createConnector({
          supertest,
          req: {
            ...getJiraConnector(),
          },
        });

        actionsRemover.add('default', jiraConnector.id, 'action', 'actions');

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                connector: {
                  id: jiraConnector.id,
                  name: 'Jira',
                  type: ConnectorTypes.jira,
                  fields: { issueType: 'Task', priority: null, parent: null },
                },
              },
            ],
          },
        });

        const connectors = await getConnectors({ caseId: postedCase.id, supertest });

        expect(Object.keys(connectors).length).to.be(1);
        expect(connectors[jiraConnector.id].id).to.be(jiraConnector.id);
      });

      it('returns the fields of the connector update after a case was created with a connector', async () => {
        const { postedCase, connector: serviceNowConnector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });

        // change urgency to 3
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                connector: {
                  id: serviceNowConnector.id,
                  name: 'SN',
                  type: ConnectorTypes.serviceNowITSM,
                  fields: {
                    urgency: '3',
                    impact: '2',
                    severity: '2',
                    category: 'software',
                    subcategory: 'os',
                  },
                },
              },
            ],
          },
        });

        const connectors = await getConnectors({ caseId: postedCase.id, supertest });

        expect(Object.keys(connectors).length).to.be(1);
        expect(connectors[serviceNowConnector.id].fields).to.eql({
          urgency: '3',
          impact: '2',
          severity: '2',
          category: 'software',
          subcategory: 'os',
        });
      });
    });

    describe('push', () => {
      describe('latestPushDate', () => {
        it('does not set latestPushDate when the connector has not been used to push', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          const connectors = await getConnectors({ caseId: postedCase.id, supertest });

          expect(Object.keys(connectors).length).to.be(1);
          expect(connectors).to.have.property(connector.id);
          expect(connectors[connector.id].latestPushDate).to.be(undefined);
        });

        it('sets latestPushDate to the most recent push date', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          await pushCase({
            supertest,
            caseId: postedCase.id,
            connectorId: connector.id,
          });

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: postCommentUserReq,
          });

          await pushCase({
            supertest,
            caseId: postedCase.id,
            connectorId: connector.id,
          });

          const [userActions, connectors] = await Promise.all([
            getCaseUserActions({ supertest, caseID: postedCase.id }),
            getConnectors({ caseId: postedCase.id, supertest }),
          ]);

          const pushes = userActions.filter((ua) => ua.type === ActionTypes.pushed);
          const latestPush = pushes[pushes.length - 1];

          expect(Object.keys(connectors).length).to.be(1);
          expect(connectors[connector.id].latestPushDate).to.eql(latestPush.created_at);
        });
      });

      describe('hasBeenPushed', () => {
        it('sets hasBeenPushed to false when the connector has not been used to push', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          const connectors = await getConnectors({ caseId: postedCase.id, supertest });

          expect(Object.keys(connectors).length).to.be(1);
          expect(connectors[connector.id].hasBeenPushed).to.be(false);
        });

        it('sets hasBeenPushed to true when the connector was used to push', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          await pushCase({
            supertest,
            caseId: postedCase.id,
            connectorId: connector.id,
          });

          const connectors = await getConnectors({ caseId: postedCase.id, supertest });

          expect(Object.keys(connectors).length).to.be(1);
          expect(connectors[connector.id].hasBeenPushed).to.be(true);
        });
      });

      describe('needsToBePushed', () => {
        it('sets needs to push to true when a push has not occurred', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          const connectors = await getConnectors({ caseId: postedCase.id, supertest });

          expect(Object.keys(connectors).length).to.be(1);
          expect(connectors[connector.id].id).to.be(connector.id);
          expect(connectors[connector.id].needsToBePushed).to.be(true);
        });

        it('sets needs to push to false when a push has occurred', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          await pushCase({
            supertest,
            caseId: postedCase.id,
            connectorId: connector.id,
          });

          const connectors = await getConnectors({ caseId: postedCase.id, supertest });

          expect(Object.keys(connectors).length).to.be(1);
          expect(connectors[connector.id].id).to.be(connector.id);
          expect(connectors[connector.id].needsToBePushed).to.be(false);
        });

        it('sets needs to push to true when a comment was created after the last push', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          await pushCase({
            supertest,
            caseId: postedCase.id,
            connectorId: connector.id,
          });

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: postCommentUserReq,
          });

          const connectors = await getConnectors({ caseId: postedCase.id, supertest });

          expect(Object.keys(connectors).length).to.be(1);
          expect(connectors[connector.id].id).to.be(connector.id);
          expect(connectors[connector.id].needsToBePushed).to.be(true);
        });

        it('sets needs to push to false when the severity of a case was changed after the last push', async () => {
          const { postedCase, connector } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          const pushedCase = await pushCase({
            supertest,
            caseId: postedCase.id,
            connectorId: connector.id,
          });

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: pushedCase.id,
                  version: pushedCase.version,
                  severity: CaseSeverity.CRITICAL,
                },
              ],
            },
          });

          const connectors = await getConnectors({ caseId: postedCase.id, supertest });

          expect(Object.keys(connectors).length).to.be(1);
          expect(connectors[connector.id].id).to.be(connector.id);
          expect(connectors[connector.id].needsToBePushed).to.be(false);
        });

        it('sets needs to push to false the service now connector and true for jira', async () => {
          const { postedCase, connector: serviceNowConnector } = await createCaseWithConnector({
            supertest,
            serviceNowSimulatorURL,
            actionsRemover,
          });

          const [pushedCase, jiraConnector] = await Promise.all([
            pushCase({
              supertest,
              caseId: postedCase.id,
              connectorId: serviceNowConnector.id,
            }),
            createConnector({
              supertest,
              req: {
                ...getJiraConnector(),
              },
            }),
          ]);

          actionsRemover.add('default', jiraConnector.id, 'action', 'actions');

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: pushedCase.id,
                  version: pushedCase.version,
                  connector: {
                    id: jiraConnector.id,
                    name: 'Jira',
                    type: ConnectorTypes.jira,
                    fields: { issueType: 'Task', priority: null, parent: null },
                  },
                },
              ],
            },
          });

          const connectors = await getConnectors({ caseId: postedCase.id, supertest });

          expect(Object.keys(connectors).length).to.be(2);
          expect(connectors[serviceNowConnector.id].id).to.be(serviceNowConnector.id);
          expect(connectors[serviceNowConnector.id].needsToBePushed).to.be(false);
          expect(connectors[jiraConnector.id].id).to.be(jiraConnector.id);
          expect(connectors[jiraConnector.id].needsToBePushed).to.be(true);
        });

        describe('changing connector fields', () => {
          it('sets needs to push to false when the latest connector fields matches those used in the push', async () => {
            const postedCase = await createCase(supertest, getPostCaseRequest());

            const serviceNowConnector = await createConnector({
              supertest,
              req: {
                ...getServiceNowConnector(),
                config: { apiUrl: serviceNowSimulatorURL },
              },
            });

            actionsRemover.add('default', serviceNowConnector.id, 'action', 'actions');

            const updatedCasesServiceNow = await updateCase({
              supertest,
              params: {
                cases: [
                  {
                    id: postedCase.id,
                    version: postedCase.version,
                    connector: {
                      id: serviceNowConnector.id,
                      name: 'SN',
                      type: ConnectorTypes.serviceNowITSM,
                      fields: {
                        urgency: '2',
                        impact: '2',
                        severity: '2',
                        category: 'software',
                        subcategory: 'os',
                      },
                    },
                  },
                ],
              },
            });

            const pushedCase = await pushCase({
              supertest,
              caseId: updatedCasesServiceNow[0].id,
              connectorId: serviceNowConnector.id,
            });

            // switch urgency to 3
            const updatedCases = await updateCase({
              supertest,
              params: {
                cases: [
                  {
                    id: pushedCase.id,
                    version: pushedCase.version,
                    connector: {
                      id: serviceNowConnector.id,
                      name: 'SN',
                      type: ConnectorTypes.serviceNowITSM,
                      fields: {
                        urgency: '3',
                        impact: '2',
                        severity: '2',
                        category: 'software',
                        subcategory: 'os',
                      },
                    },
                  },
                ],
              },
            });

            // switch urgency back to 2
            await updateCase({
              supertest,
              params: {
                cases: [
                  {
                    id: updatedCases[0].id,
                    version: updatedCases[0].version,
                    connector: {
                      id: serviceNowConnector.id,
                      name: 'SN',
                      type: ConnectorTypes.serviceNowITSM,
                      fields: {
                        urgency: '2',
                        impact: '2',
                        severity: '2',
                        category: 'software',
                        subcategory: 'os',
                      },
                    },
                  },
                ],
              },
            });

            const connectors = await getConnectors({ caseId: postedCase.id, supertest });

            expect(Object.keys(connectors).length).to.be(1);
            expect(connectors[serviceNowConnector.id].id).to.be(serviceNowConnector.id);
            expect(connectors[serviceNowConnector.id].needsToBePushed).to.be(false);
          });

          it('sets needs to push to true when the latest connector fields do not match those used in the push', async () => {
            const { postedCase, connector: serviceNowConnector } = await createCaseWithConnector({
              supertest,
              serviceNowSimulatorURL,
              actionsRemover,
            });

            const pushedCase = await pushCase({
              supertest,
              caseId: postedCase.id,
              connectorId: serviceNowConnector.id,
            });

            // switch urgency to 3
            await updateCase({
              supertest,
              params: {
                cases: [
                  {
                    id: pushedCase.id,
                    version: pushedCase.version,
                    connector: {
                      id: serviceNowConnector.id,
                      name: 'SN',
                      type: ConnectorTypes.serviceNowITSM,
                      fields: {
                        urgency: '3',
                        impact: '2',
                        severity: '2',
                        category: 'software',
                        subcategory: 'os',
                      },
                    },
                  },
                ],
              },
            });

            const connectors = await getConnectors({ caseId: postedCase.id, supertest });

            expect(Object.keys(connectors).length).to.be(1);
            expect(connectors[serviceNowConnector.id].id).to.be(serviceNowConnector.id);
            expect(connectors[serviceNowConnector.id].needsToBePushed).to.be(true);
          });
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should retrieve the connectors for a case', async () => {
        const { postedCase, connector: serviceNowConnector } = await createCaseWithConnector({
          supertest: supertestWithoutAuth,
          serviceNowSimulatorURL,
          actionsRemover,
          auth: { user: superUser, space: 'space1' },
          createCaseReq: getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        });

        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          const connectors = await getConnectors({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user, space: 'space1' },
          });

          expect(Object.keys(connectors).length).to.eql(1);
          expect(connectors[serviceNowConnector.id].id).to.eql(serviceNowConnector.id);
        }
      });

      it('should not get connectors for a case when the user does not have access to the owner', async () => {
        const { postedCase } = await createCaseWithConnector({
          supertest: supertestWithoutAuth,
          serviceNowSimulatorURL,
          actionsRemover,
          auth: { user: superUser, space: 'space1' },
          createCaseReq: getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        });

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
          await getConnectors({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            expectedHttpCode: 403,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not get a case in a space the user does not have permissions to', async () => {
        const { postedCase } = await createCaseWithConnector({
          supertest: supertestWithoutAuth,
          serviceNowSimulatorURL,
          actionsRemover,
          auth: { user: superUser, space: 'space2' },
          createCaseReq: getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        });

        await getConnectors({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          expectedHttpCode: 403,
          auth: { user: secOnly, space: 'space2' },
        });
      });
    });
  });
};
