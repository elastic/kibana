/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { verifyDockerInstalled, maybeCreateDockerNetwork } from '@kbn/es';
import { startRuntimeServices } from '@kbn/security-solution-plugin/scripts/endpoint/endpoint_agent_runner/runtime';
import { FtrProviderContext } from '../ftr_provider_context';
import { FleetManager } from '../../osquery_cypress/fleet_server';
import { AgentManager } from '../../osquery_cypress/agent';
import { getLatestAvailableAgentVersion, createAgentPolicy } from '../../osquery_cypress/utils';

const currentTimeMinusNineMinutes = new Date(Date.now() - 300000).toISOString();
const CIS_GCP_OPTION_TEST_ID = 'cisGcpTestId';
const GCP_ORGANIZATION_TEST_ID = 'gcpOrganizationAccountTestId';
const GCP_SINGLE_ACCOUNT_TEST_ID = 'gcpSingleAccountTestId';
const GCP_CLOUD_SHELL_TEST_ID = 'gcpGoogleCloudShellOptionTestId';
const GCP_MANUAL_TEST_ID = 'gcpManualOptionTestId';
const PRJ_ID_TEST_ID = 'project_id_test_id';
const ORG_ID_TEST_ID = 'organization_id_test_id';
const CREDENTIALS_TYPE_TEST_ID = 'credentials_type_test_id';
const CREDENTIALS_FILE_TEST_ID = 'credentials_file_test_id';
const CREDENTIALS_JSON_TEST_ID = 'credentials_json_test_id';

// eslint-disable-next-line import/no-default-export
export default function (providerContext2: FtrProviderContext) {
  const { getService, getPageObjects } = providerContext2;
  const pageObjects = getPageObjects(['cloudPostureDashboard', 'cisAddIntegration', 'header']);
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const log = getService('log');
  const config = getService('config');
  const kbnClient = getService('kibanaServer');

  const elasticUrl = 'http://host.docker.internal:9200';
  const kibanaUrl = Url.format(config.get('servers.kibana'));
  const fleetServerUrl = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.fleetserver.port'),
  });
  console.log(elasticUrl);
  console.log(kibanaUrl);
  console.log(fleetServerUrl);
  const username = config.get('servers.elasticsearch.username');
  const password = config.get('servers.elasticsearch.password');
  console.log(username);
  console.log(password);

  describe('GET /internal/cloud_security_posture/status', () => {
    let agentPolicyId: string;
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;

    describe('STATUS = WAITING_FOR_RESULT TEST', () => {
      // setupFleetAndAgents(providerContext2);

      beforeEach(async () => {
        await verifyDockerInstalled(log);
        await maybeCreateDockerNetwork(log);

        await startRuntimeServices({
          log,
          elasticUrl,
          kibanaUrl,
          fleetServerUrl,
          username,
          password,
          version: await getLatestAvailableAgentVersion(kbnClient),
        });
        await new FleetManager(log).setup();
        const policyEnrollmentKey = await createAgentPolicy(kbnClient, log, 'Default policy');
        const policyEnrollmentKeyTwo = await createAgentPolicy(kbnClient, log, 'Osquery policy');

        await new AgentManager(
          policyEnrollmentKey,
          config.get('servers.fleetserver.port'),
          log
        ).setup();
        await new AgentManager(
          policyEnrollmentKeyTwo,
          config.get('servers.fleetserver.port'),
          log
        ).setup();
        cisIntegration = pageObjects.cisAddIntegration;
        cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;
        await kibanaServer.savedObjects.cleanStandardList();
        // await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
        // const getPkRes = await supertest
        //   .get(`/api/fleet/epm/packages/fleet_server`)
        //   .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        //   .set('kbn-xsrf', 'xxxx')
        //   .expect(200);
        // const pkgVersion = getPkRes.body.item.version;
        // await supertest
        //   .post(`/api/fleet/epm/packages/fleet_server/${pkgVersion}`)
        //   .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        //   .set('kbn-xsrf', 'xxxx')
        //   .send({ force: true })
        //   .expect(200);

        // const { body: agentPolicyResponse } = await supertest
        //   .post(`/api/fleet/agent_policies`)
        //   .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        //   .set('kbn-xsrf', 'xxxx')
        //   .send({
        //     name: 'Test policy a1',
        //     namespace: 'default',
        //   });

        // agentPolicyId = agentPolicyResponse.item.id;

        // await supertest
        //   .post(`/api/fleet/fleet_server_hosts`)
        //   .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        //   .set('kbn-xsrf', 'xxxx')
        //   .send({
        //     id: 'test-default-a1',
        //     name: 'Default',
        //     is_default: true,
        //     host_urls: ['https://test.com:8080', 'https://test.com:8081'],
        //   })
        //   .expect(200);
        // await generateAgent(providerContext2, 'healthy', `Agent policy test 2`, agentPolicyId);
        await cisIntegration.navigateToAddIntegrationCspmPage();
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        // await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });

      it(`TEST CLOUD SHELL URL`, async () => {
        // await createPackagePolicy(
        //   supertest,
        //   agentPolicyId,
        //   'kspm',
        //   'cloudbeat/cis_k8s',
        //   'vanilla',
        //   'kspm'
        // );

        // await kibanaServer.savedObjects.update({
        //   id: 'cloud_security_posture',
        //   type: 'epm-packages',
        //   attributes: {
        //     install_started_at: currentTimeMinusNineMinutes,
        //   },
        // });
        await cisIntegrationGcp.clickOptionButton(CIS_GCP_OPTION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_ORGANIZATION_TEST_ID);
        await cisIntegrationGcp.clickOptionButton(GCP_CLOUD_SHELL_TEST_ID);
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegrationGcp.clickOptionButton('confirmGoogleCloudShellModalConfirmButton');
        // await cisIntegrationGcp.test();
        await new Promise((r) => setTimeout(r, 600000));
        // const { body: res }: { body: CspSetupStatus } = await supertest
        //   .get(`/internal/cloud_security_posture/status`)
        //   .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        //   .set('kbn-xsrf', 'xxxx')
        //   .expect(200);
        // expect(res.kspm.status).to.eql(
        //   'waiting_for_results',
        //   `expected kspm status to be waiting_for_results but got ${res.kspm.status} instead`
        // );
      });
    });
  });
}
