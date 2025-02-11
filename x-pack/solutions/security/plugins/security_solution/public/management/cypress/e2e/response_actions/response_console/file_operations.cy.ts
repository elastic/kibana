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
  waitForCommandToBeExecuted,
  waitForEndpointListPageToBeLoaded,
} from '../../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../../tasks/fleet';

import { login } from '../../../tasks/login';
import { enableAllPolicyProtections } from '../../../tasks/endpoint_policy';
import { createEndpointHost } from '../../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../../tasks/delete_all_endpoint_data';

// Failing: See https://github.com/elastic/kibana/issues/209066
// Failing: See https://github.com/elastic/kibana/issues/209065
describe.skip('Response console', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
  });

  describe('File operations:', () => {
    const homeFilePath = Cypress.env('IS_CI') ? '/home/vagrant' : '/home/ubuntu';

    const fileContent = 'This is a test file for the get-file command.';
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
            // Create and enroll a new Endpoint host
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

    it('"get-file --path" - should retrieve a file', () => {
      const downloadsFolder = Cypress.config('downloadsFolder');

      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      cy.task('createFileOnEndpoint', {
        hostname: createdHost.hostname,
        path: filePath,
        content: fileContent,
      });

      // initiate get file action and wait for the API to complete
      cy.intercept('api/endpoint/action/get_file').as('getFileAction');
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`get-file --path ${filePath}`);
      submitCommand();
      cy.wait('@getFileAction', { timeout: 60000 });

      // verify that the file was retrieved
      // and that the file download link is available
      cy.getByTestSubj('getFileSuccess').within(() => {
        cy.contains('File retrieved from the host.');
        cy.contains('(ZIP file passcode: elastic)');
        cy.contains(
          'Files are periodically deleted to clear storage space. Download and save file locally if needed.'
        );
        cy.contains('Click here to download').should('exist');
      });

      cy.contains('Click here to download').click();

      // wait for file to be downloaded
      cy.readFile(`${downloadsFolder}/upload.zip`, { timeout: 120000 }).should('exist');

      // move the zip file to VM
      cy.task('uploadFileToEndpoint', {
        hostname: createdHost.hostname,
        srcPath: `${downloadsFolder}/upload.zip`,
        destPath: `${homeFilePath}/upload.zip`,
      });

      // unzip the file and read its content
      cy.task('readZippedFileContentOnEndpoint', {
        hostname: createdHost.hostname,
        path: `${homeFilePath}/upload.zip`,
        password: 'elastic',
      }).then((unzippedFileContent) => {
        expect(unzippedFileContent).to.contain(fileContent);
      });
    });

    it('"upload --file" - should upload a file', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`upload --file`);
      cy.getByTestSubj('console-arg-file-picker').selectFile(
        {
          contents: Cypress.Buffer.from('upload file content here!'),
          fileName: 'upload_file.txt',
          lastModified: Date.now(),
        },
        { force: true }
      );
      submitCommand();
      waitForCommandToBeExecuted('upload');
    });
  });
});
