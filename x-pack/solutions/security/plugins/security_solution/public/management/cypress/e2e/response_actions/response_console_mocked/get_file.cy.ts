/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionDetails } from '../../../../../../common/endpoint/types';
import type { ReturnTypeFromChainable } from '../../../types';
import { indexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import {
  inputConsoleCommand,
  openResponseConsoleFromEndpointList,
  submitCommand,
  waitForEndpointListPageToBeLoaded,
} from '../../../tasks/response_console';
import { interceptActionRequests, sendActionResponse } from '../../../tasks/isolate';
import { login } from '../../../tasks/login';

describe('Response console', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  beforeEach(() => {
    login();
  });

  describe('`get-file` command', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let endpointHostname: string;
    let getFileRequestResponse: ActionDetails;

    beforeEach(() => {
      indexEndpointHosts({ withResponseActions: false, isolation: false }).then(
        (indexEndpoints) => {
          endpointData = indexEndpoints;
          endpointHostname = endpointData.data.hosts[0].host.name;
        }
      );
    });

    afterEach(() => {
      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }
    });

    it('should get file from response console', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`get-file --path /test/path/test.txt`);

      interceptActionRequests((responseBody) => {
        getFileRequestResponse = responseBody;
      }, 'get-file');
      submitCommand();
      cy.contains('Retrieving the file from host.').should('exist');
      cy.wait('@get-file').then(() => {
        sendActionResponse(getFileRequestResponse);
      });
      cy.getByTestSubj('getFileSuccess').within(() => {
        cy.contains('File retrieved from the host.');
        cy.contains('(ZIP file passcode: elastic)');
        cy.contains(
          'Files are periodically deleted to clear storage space. Download and save file locally if needed.'
        );
        cy.contains('Click here to download').click();
      });

      const downloadsFolder = Cypress.config('downloadsFolder');
      cy.readFile(`${downloadsFolder}/upload.zip`);
    });
  });
});
