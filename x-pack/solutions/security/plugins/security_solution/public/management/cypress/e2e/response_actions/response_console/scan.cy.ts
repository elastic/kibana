/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PolicyData } from '../../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../../scripts/endpoint/common/endpoint_host_services';
import {
  inputConsoleCommand,
  openResponseConsoleFromEndpointList,
  submitCommand,
  waitForEndpointListPageToBeLoaded,
} from '../../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../../tasks/fleet';

import { login } from '../../../tasks/login';
import { enableAllPolicyProtections } from '../../../tasks/endpoint_policy';
import { createEndpointHost } from '../../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../../tasks/delete_all_endpoint_data';

describe(
  'Response console',
  {
    env: {
      ftrConfig: {
        // This is not needed for this test, but it's a good example of
        // how to enable experimental features in the Cypress tests.
        // kbnServerArgs: [
        //   `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        //     'featureFlagName',
        //   ])}`,
        // ],
      },
    },
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    beforeEach(() => {
      login();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/187932
    describe.skip('Scan operation:', () => {
      const homeFilePath = Cypress.env('IS_CI') ? '/home/vagrant' : '/home';

      const fileContent = 'This is a test file for the scan command.';
      const filePath = `${homeFilePath}/test_file.txt`;

      let indexedPolicy: IndexedFleetEndpointPolicyResponse;
      let policy: PolicyData;
      let createdHost: CreateAndEnrollEndpointHostResponse;

      before(() => {
        getEndpointIntegrationVersion().then((version) =>
          createAgentPolicyTask(version).then((data) => {
            indexedPolicy = data;
            policy = indexedPolicy.integrationPolicies[0];

            return enableAllPolicyProtections(policy.id).then(() => {
              return createEndpointHost(policy.policy_ids[0]).then((host) => {
                createdHost = host as CreateAndEnrollEndpointHostResponse;
              });
            });
          })
        );
      });

      after(() => {
        if (createdHost) {
          cy.task('destroyEndpointHost', createdHost);
        }

        if (indexedPolicy) {
          cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
        }

        if (createdHost) {
          deleteAllLoadedEndpointData({ endpointAgentIds: [createdHost.agentId] });
        }
      });

      afterEach(function () {
        if (Cypress.env('IS_CI') && this.currentTest?.isFailed() && createdHost) {
          cy.task('captureHostVmAgentDiagnostics', {
            hostname: createdHost.hostname,
            fileNamePrefix: this.currentTest?.fullTitle(),
          });
        }
      });

      [
        ['file', filePath],
        ['folder', homeFilePath],
      ].forEach(([type, path]) => {
        it(`"scan --path" - should scan a ${type}`, () => {
          waitForEndpointListPageToBeLoaded(createdHost.hostname);
          cy.task('createFileOnEndpoint', {
            hostname: createdHost.hostname,
            path: filePath,
            content: fileContent,
          });

          cy.intercept('api/endpoint/action/scan').as('scanAction');
          openResponseConsoleFromEndpointList();
          inputConsoleCommand(`scan --path ${path}`);
          submitCommand();
          cy.wait('@scanAction', { timeout: 60000 });

          cy.contains('Scan complete').click();
        });
      });

      it('"scan --path" - should scan a folder and report errors', () => {
        waitForEndpointListPageToBeLoaded(createdHost.hostname);

        cy.intercept('api/endpoint/action/scan').as('scanAction');
        openResponseConsoleFromEndpointList();
        inputConsoleCommand(`scan --path ${homeFilePath}/non_existent_folder`);
        submitCommand();
        cy.wait('@scanAction', { timeout: 60000 });

        cy.getByTestSubj('scan-actionFailure')
          .should('exist')
          .contains('File path or folder was not found (404)');
      });
    });
  }
);
