/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { wrapErrorAndRejectPromise } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import expect from '@kbn/expect';
import {
  ACTION_AGENT_FILE_INFO_ROUTE,
  EXECUTE_ROUTE,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { ActionDetails } from '@kbn/security-solution-plugin/common/endpoint/types';
import { getFileDownloadId } from '@kbn/security-solution-plugin/common/endpoint/service/response_actions/get_file_download_id';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const endpointTestResources = getService('endpointTestResources');
  const rolesUsersProvider = getService('rolesUsersProvider');

  // @skipInServerlessMKI - this test uses internal index manipulation in before/after hooks
  describe('@ess @serverless @skipInServerlessMKI Endpoint `execute` response action', function () {
    let indexedData: IndexedHostsAndAlertsResponse;
    let agentId = '';

    before(async () => {
      indexedData = await endpointTestResources.loadEndpointData();
      agentId = indexedData.hosts[0].agent.id;
    });

    after(async () => {
      if (indexedData) {
        await endpointTestResources.unloadEndpointData(indexedData);
      }
    });

    it('should not allow `execute` action without required privilege', async () => {
      await supertestWithoutAuth
        .post(EXECUTE_ROUTE)
        .auth(ROLE.t1_analyst, 'changeme')
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({ endpoint_ids: [agentId], parameters: { command: 'ls -la' } })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Endpoint authorization failure',
        })
        .catch(wrapErrorAndRejectPromise);
    });

    it('should error on invalid endpoint id', async () => {
      await supertestWithoutAuth
        .post(EXECUTE_ROUTE)
        .auth(ROLE.endpoint_operations_analyst, 'changeme')
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({ endpoint_ids: [' '], parameters: { command: 'ls -la' } })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: '[request body.endpoint_ids]: endpoint_ids cannot contain empty strings',
        });
    });

    it('should error on missing endpoint id', async () => {
      await supertestWithoutAuth
        .post(EXECUTE_ROUTE)
        .auth(ROLE.endpoint_operations_analyst, 'changeme')
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({ parameters: { command: 'ls -la' } })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message:
            '[request body.endpoint_ids]: expected value of type [array] but got [undefined]',
        });
    });

    it('should error on invalid `command` parameter', async () => {
      await supertestWithoutAuth
        .post(EXECUTE_ROUTE)
        .auth(ROLE.endpoint_operations_analyst, 'changeme')
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({ endpoint_ids: [agentId], parameters: { command: ' ' } })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: '[request body.parameters.command]: command cannot be an empty string',
        });
    });

    it('should error on missing `command` parameter', async () => {
      await supertestWithoutAuth
        .post(EXECUTE_ROUTE)
        .auth(ROLE.endpoint_operations_analyst, 'changeme')
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({ endpoint_ids: [agentId] })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message:
            '[request body.parameters.command]: expected value of type [string] but got [undefined]',
        });
    });

    it('should error on invalid `timeout` parameter', async () => {
      await supertestWithoutAuth
        .post(EXECUTE_ROUTE)
        .auth(ROLE.endpoint_operations_analyst, 'changeme')
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({ endpoint_ids: [agentId], parameters: { command: 'ls -la', timeout: 'too' } })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message:
            '[request body.parameters.timeout]: expected value of type [number] but got [string]',
        });
    });

    it('should succeed with valid endpoint id and command', async () => {
      const {
        body: { data },
      } = await supertestWithoutAuth
        .post(EXECUTE_ROUTE)
        .auth(ROLE.endpoint_operations_analyst, 'changeme')
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({ endpoint_ids: [agentId], parameters: { command: 'ls -la' } })
        .expect(200);

      expect(data.agents[0]).to.eql(agentId);
      expect(data.command).to.eql('execute');
      expect(data.parameters.command).to.eql('ls -la');
    });

    it('should succeed with valid endpoint id, command and an optional timeout', async () => {
      const {
        body: { data },
      } = await supertestWithoutAuth
        .post(EXECUTE_ROUTE)
        .auth(ROLE.endpoint_operations_analyst, 'changeme')
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .send({ endpoint_ids: [agentId], parameters: { command: 'ls -la', timeout: 2000 } })
        .expect(200);

      expect(data.agents[0]).to.eql(agentId);
      expect(data.command).to.eql('execute');
      expect(data.parameters.command).to.eql('ls -la');
      expect(data.parameters.timeout).to.eql(2000);
    });

    // Test checks to ensure API works with a custom role
    describe('@skipInServerless @skipInServerlessMKI and with minimal authz', () => {
      const username = 'execute_limited';
      const password = 'changeme';
      let fileInfoApiRoutePath: string = '';

      before(async () => {
        await rolesUsersProvider.createRole({
          customRole: {
            roleName: username,
            extraPrivileges: ['minimal_all', 'execute_operations_all'],
          },
        });
        await rolesUsersProvider.createUser({ name: username, password, roles: [username] });

        const {
          body: { data },
        } = await supertestWithoutAuth
          .post(EXECUTE_ROUTE)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .set('Elastic-Api-Version', '2023-10-31')
          .send({ endpoint_ids: [agentId], parameters: { command: 'ls -la' } })
          .expect(200);

        const actionDetails = data as ActionDetails;

        fileInfoApiRoutePath = ACTION_AGENT_FILE_INFO_ROUTE.replace('{action_id}', data.id).replace(
          '{file_id}',
          getFileDownloadId(actionDetails)
        );
      });

      after(async () => {
        await rolesUsersProvider.deleteRoles([username]);
        await rolesUsersProvider.deleteUsers([username]);
      });

      it('should have access to file info api', async () => {
        await supertestWithoutAuth
          .get(fileInfoApiRoutePath)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .set('Elastic-Api-Version', '2023-10-31')
          // We expect 404 because the indexes with the file info don't exist.
          // The key here is that we do NOT get a 401 or 403
          .expect(404);
      });

      it('should have access to file download api', async () => {
        await supertestWithoutAuth
          .get(`${fileInfoApiRoutePath}/download`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .set('Elastic-Api-Version', '2023-10-31')
          // We expect 404 because the indexes with the file info don't exist.
          // The key here is that we do NOT get a 401 or 403
          .expect(404);
      });
    });
  });
}
