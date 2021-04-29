/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';
import * as st from 'supertest';
import supertestAsPromised from 'supertest-as-promised';
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
  getServiceNowConnector,
  createConnector,
  createConfiguration,
  createCase,
  pushCase,
  createComment,
  CreateConnectorResponse,
  updateCase,
  getAllUserAction,
  removeServerGeneratedPropertiesFromUserAction,
  deleteAllCaseItems,
} from '../../../../common/lib/utils';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '../../../../../alerting_api_integration/common/fixtures/plugins/actions_simulators/server/plugin';
import {
  CaseConnector,
  CasePostRequest,
  CaseResponse,
  CaseStatuses,
  CaseUserActionResponse,
  ConnectorTypes,
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
import { User } from '../../../../common/lib/authentication/types';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('push_case', () => {
    const actionsRemover = new ActionsRemover(supertest);

    let servicenowSimulatorURL: string = '<could not determine kibana url>';
    before(() => {
      servicenowSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    const createCaseWithConnector = async ({
      testAgent = supertest,
      configureReq = {},
      auth = { user: superUser, space: null },
      createCaseReq = getPostCaseRequest(),
    }: {
      testAgent?: st.SuperTest<supertestAsPromised.Test>;
      configureReq?: Record<string, unknown>;
      auth?: { user: User; space: string | null };
      createCaseReq?: CasePostRequest;
    } = {}): Promise<{
      postedCase: CaseResponse;
      connector: CreateConnectorResponse;
    }> => {
      const connector = await createConnector({
        supertest: testAgent,
        req: {
          ...getServiceNowConnector(),
          config: { apiUrl: servicenowSimulatorURL },
        },
        auth,
      });

      actionsRemover.add(auth.space ?? 'default', connector.id, 'action', 'actions');
      await createConfiguration(
        testAgent,
        {
          ...getConfigurationRequest({
            id: connector.id,
            name: connector.name,
            type: connector.connector_type_id as ConnectorTypes,
          }),
          ...configureReq,
        },
        200,
        auth
      );

      const postedCase = await createCase(
        testAgent,
        {
          ...createCaseReq,
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
        200,
        auth
      );

      return { postedCase, connector };
    };

    it('should push a case', async () => {
      const { postedCase, connector } = await createCaseWithConnector();
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

      // external_url is of the form http://elastic:changeme@localhost:5620 which is different between various environments like Jekins
      expect(
        external_url.includes(
          'api/_actions-FTS-external-service-simulators/servicenow/nav_to.do?uri=incident.do?sys_id=123'
        )
      ).to.equal(true);
    });

    it('pushes a comment appropriately', async () => {
      const { postedCase, connector } = await createCaseWithConnector();
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
      });
      const theCase = await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: connector.id,
      });

      expect(theCase.status).to.eql('closed');
    });

    it('should create the correct user action', async () => {
      const { postedCase, connector } = await createCaseWithConnector();
      const pushedCase = await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: connector.id,
      });
      const userActions = await getAllUserAction(supertest, pushedCase.id);
      const pushUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[1]);

      const { new_value, ...rest } = pushUserAction as CaseUserActionResponse;
      const parsedNewValue = JSON.parse(new_value!);

      expect(rest).to.eql({
        action_field: ['pushed'],
        action: 'push-to-service',
        action_by: defaultUser,
        old_value: null,
        case_id: `${postedCase.id}`,
        comment_id: null,
        sub_case_id: '',
      });

      expect(parsedNewValue).to.eql({
        pushed_at: pushedCase.external_service!.pushed_at,
        pushed_by: defaultUser,
        connector_id: connector.id,
        connector_name: connector.name,
        external_id: '123',
        external_title: 'INC01',
        external_url: `${servicenowSimulatorURL}/nav_to.do?uri=incident.do?sys_id=123`,
      });
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    it.skip('should push a collection case but not close it when closure_type: close-by-pushing', async () => {
      const { postedCase, connector } = await createCaseWithConnector({
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
      const { postedCase, connector } = await createCaseWithConnector();
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
          testAgent: supertestWithoutAuth,
          auth: { user: superUser, space: 'space1' },
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
          testAgent: supertestWithoutAuth,
          auth: { user: superUser, space: 'space1' },
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
            testAgent: supertestWithoutAuth,
            auth: { user: superUser, space: 'space1' },
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
          testAgent: supertestWithoutAuth,
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
