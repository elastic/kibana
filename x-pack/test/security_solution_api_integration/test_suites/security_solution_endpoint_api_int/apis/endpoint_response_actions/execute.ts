/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { wrapErrorAndRejectPromise } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import expect from '@kbn/expect';
import { EXECUTE_ROUTE } from '@kbn/security-solution-plugin/common/endpoint/constants';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { FtrProviderContext } from '../../configs/ftr_provider_context';
import { ROLE } from '../../services/roles_users';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const endpointTestResources = getService('endpointTestResources');

  describe('@ess @serverless Endpoint `execute` response action', function () {
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
  });
}
