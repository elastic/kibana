/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getUrlPrefix } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/actions');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/actions');
    });

    it('7.10.0 migrates the `casesConfiguration` to be the `incidentConfiguration` in `config`, then 7.11.0 removes `incidentConfiguration`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/actions/action/791a2ab1-784a-46ea-aa68-04c837e5da2d`
      );

      expect(response.status).to.eql(200);
      expect(response.body.config).not.key('incidentConfiguration');
      expect(response.body.config).not.key('casesConfiguration');
      expect(response.body.config).not.key('isCaseOwned');
      expect(response.body.config).to.eql({
        apiUrl:
          'http://elastic:changeme@localhost:5620/api/_actions-FTS-external-service-simulators/jira',
        projectKey: 'CK',
      });
    });

    it('7.11.0 migrates webhook connector configurations to have `hasAuth` property', async () => {
      const responseWithAuth = await supertest.get(
        `${getUrlPrefix(``)}/api/actions/action/949f909b-20a0-46e3-aadb-6a4d117bb592`
      );

      expect(responseWithAuth.status).to.eql(200);
      expect(responseWithAuth.body.config).key('hasAuth');
      expect(responseWithAuth.body.config.hasAuth).to.eql(true);

      const responseNoAuth = await supertest.get(
        `${getUrlPrefix(``)}/api/actions/action/7434121e-045a-47d6-a0a6-0b6da752397a`
      );
      expect(responseNoAuth.status).to.eql(200);
      expect(responseNoAuth.body.config).key('hasAuth');
      expect(responseNoAuth.body.config.hasAuth).to.eql(false);
    });

    it('7.14.0 migrates connectors to have `isMissingSecrets` property', async () => {
      const responseWithisMissingSecrets = await supertest.get(
        `${getUrlPrefix(``)}/api/actions/action/7434121e-045a-47d6-a0a6-0b6da752397a`
      );

      expect(responseWithisMissingSecrets.status).to.eql(200);
      expect(responseWithisMissingSecrets.body.isMissingSecrets).to.eql(false);
    });

    it('7.16.0 migrates email connector configurations to set `service` property if not set', async () => {
      const connectorWithService = await supertest.get(
        `${getUrlPrefix(``)}/api/actions/action/0f8f2810-0a59-11ec-9a7c-fd0c2b83ff7c`
      );

      expect(connectorWithService.status).to.eql(200);
      expect(connectorWithService.body.config).key('service');
      expect(connectorWithService.body.config.service).to.eql('someservice');

      const connectorWithoutService = await supertest.get(
        `${getUrlPrefix(``)}/api/actions/action/1e0824a0-0a59-11ec-9a7c-fd0c2b83ff7c`
      );

      expect(connectorWithoutService.status).to.eql(200);
      expect(connectorWithoutService.body.config).key('service');
      expect(connectorWithoutService.body.config.service).to.eql('other');
    });

    it('decryption error during migration', async () => {
      const badEmailConnector = await supertest.get(
        `${getUrlPrefix(``)}/api/actions/connector/0f8f2810-0a59-11ec-9a7c-fd0c2b83ff7d`
      );

      expect(badEmailConnector.status).to.eql(200);
      expect(badEmailConnector.body.secrets).to.eql(undefined);

      const response = await supertest
        .post(
          `${getUrlPrefix(``)}/api/actions/connector/0f8f2810-0a59-11ec-9a7c-fd0c2b83ff7d/_execute`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            message: 'am i working?',
            to: ['user@test.com'],
            subject: 'test',
          },
        });

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        connector_id: '0f8f2810-0a59-11ec-9a7c-fd0c2b83ff7d',
        status: 'error',
        message: `error validating action type connector: secrets must be defined`,
        retry: false,
      });
    });
  });
}
