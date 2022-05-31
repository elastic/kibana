/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import http from 'http';

import expect from '@kbn/expect';
import { CaseConnector, CaseStatuses, CommentType } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';

import {
  postCaseReq,
  defaultUser,
  postCommentUserReq,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  getConfigurationRequest,
  createCase,
  pushCase,
  createComment,
  updateCase,
  deleteAllCaseItems,
  superUserSpace1Auth,
  createCaseWithConnector,
  createConnector,
  getServiceNowConnector,
  getConnectorMappingsFromES,
  getCase,
  getServiceNowSimulationServer,
  createConfiguration,
  getSignalsWithES,
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('push_case', () => {
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

      actionsRemover.add('default', newConnector.id, 'action', 'actions');
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

    it('should create the mappings when pushing a case', async () => {
      // create a connector but not a configuration so that the mapping will not be present
      const connector = await createConnector({
        supertest,
        req: {
          ...getServiceNowConnector(),
          config: { apiUrl: serviceNowSimulatorURL },
        },
      });

      actionsRemover.add('default', connector.id, 'action', 'actions');

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
      let mappings = await getConnectorMappingsFromES({ es });
      expect(mappings.body.hits.hits.length).to.eql(0);

      await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: connector.id,
      });

      // the mappings should now be created after the push
      mappings = await getConnectorMappingsFromES({ es });
      expect(mappings.body.hits.hits.length).to.be(1);
      expect(
        mappings.body.hits.hits[0]._source?.['cases-connector-mappings'].mappings.length
      ).to.be.above(0);
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

    it('unhappy path = 409s when case is closed', async () => {
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
        expectedHttpCode: 409,
      });
    });

    describe('alerts', () => {
      const defaultSignalsIndex = '.siem-signals-default-000001';
      const signalID = '4679431ee0ba3209b6fcd60a255a696886fe0a7d18f5375de510ff5b68fa6b78';
      const signalID2 = '1023bcfea939643c5e51fd8df53797e0ea693cee547db579ab56d96402365c1e';

      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/default');
      });

      afterEach(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/default');
        await deleteAllCaseItems(es);
      });

      const attachAlertsAndPush = async ({ syncAlerts = true }: { syncAlerts?: boolean } = {}) => {
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
            type: CommentType.alert,
            owner: 'securitySolutionFixture',
          },
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            alertId: signalID2,
            index: defaultSignalsIndex,
            rule: { id: 'test-rule-id', name: 'test-index-id' },
            type: CommentType.alert,
            owner: 'securitySolutionFixture',
          },
        });

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
      const supertestWithoutAuth = getService('supertestWithoutAuth');

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
          includeComments: false,
          auth: { user: superUser, space: 'space1' },
        });

        expect(theCase.status).to.eql('open');
      });
    });
  });
};
