/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import http from 'http';

import expect from '@kbn/expect';
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
  getCaseUserActions,
  removeServerGeneratedPropertiesFromUserAction,
  deleteAllCaseItems,
  superUserSpace1Auth,
  createCaseWithConnector,
  createConnector,
  getServiceNowConnector,
  getConnectorMappingsFromES,
  getCase,
  getServiceNowSimulationServer,
} from '../../../../common/lib/utils';
import {
  CaseConnector,
  CaseStatuses,
  CaseUserActionResponse,
} from '../../../../../../plugins/cases/common/api';
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

    it('should create the correct user action', async () => {
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
      const userActions = await getCaseUserActions({ supertest, caseID: pushedCase.id });
      const pushUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[1]);

      const { new_value, ...rest } = pushUserAction as CaseUserActionResponse;
      const parsedNewValue = JSON.parse(new_value!);

      expect(rest).to.eql({
        action_field: ['pushed'],
        action: 'push-to-service',
        action_by: defaultUser,
        old_value: null,
        old_val_connector_id: null,
        new_val_connector_id: connector.id,
        case_id: `${postedCase.id}`,
        comment_id: null,
        sub_case_id: '',
        owner: 'securitySolutionFixture',
      });

      expect(parsedNewValue).to.eql({
        pushed_at: pushedCase.external_service!.pushed_at,
        pushed_by: defaultUser,
        connector_name: connector.name,
        external_id: '123',
        external_title: 'INC01',
        external_url: `${serviceNowSimulatorURL}/nav_to.do?uri=incident.do?sys_id=123`,
      });
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    it.skip('should push a collection case but not close it when closure_type: close-by-pushing', async () => {
      const { postedCase, connector } = await createCaseWithConnector({
        supertest,
        serviceNowSimulatorURL,
        actionsRemover,
        configureReq: {
          closure_type: 'close-by-pushing',
        },
      });

      const theCase = await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: connector.id,
      });
      expect(theCase.status).to.eql(CaseStatuses.open);
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

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should push a case that the user has permissions for', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
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
          supertest,
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
            supertest,
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
          supertest,
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
    });
  });
};
