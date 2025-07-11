/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { login } from '../../tasks/login';
import { IS_SERVERLESS } from '../../env_var_names_constants';
describe('Anonymization Fields Duplication Tests', { tags: ['@ess', '@serverless'] }, () => {
  const expectedAnonymizationFieldsCount = 102;
  const numberOfSpaces = 30; // Number of spaces to create simultaneously
  let spaceId: string;
  // Track all created spaces for cleanup
  const createdSpaceIds: string[] = [];

  beforeEach(() => {
    spaceId = uuidv4();
    login(Cypress.env(IS_SERVERLESS) ? 'admin' : undefined);
    createdSpaceIds.push(spaceId);

    // Create a test space
    cy.request({
      method: 'POST',
      url: '/api/spaces/space',
      headers: { 'kbn-xsrf': 'true' },
      body: {
        id: spaceId,
        name: spaceId,
        disabledFeatures: [],
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
    });

    // Visit the anonymization tab to initialize the UI
    cy.visit(`/s/${spaceId}/app/management/kibana/securityAiAssistantManagement?tab=anonymization`);
    cy.contains('Anonymization').should('be.visible');
  });

  afterEach(() => {
    // Clean up all created spaces
    cy.log(`Cleaning up ${createdSpaceIds.length} spaces`);

    // Delete each space sequentially
    createdSpaceIds.forEach((id) => {
      cy.request({
        method: 'DELETE',
        url: `/api/spaces/space/${id}`,
        headers: { 'kbn-xsrf': 'true' },
        failOnStatusCode: false, // Don't fail if a space doesn't exist
      }).then((response) => {
        cy.log(`Deleted space ${id} with status ${response.status}`);
      });
    });

    // Clear the array after cleanup
    createdSpaceIds.length = 0;
  });

  it('Tests multiple spaces created and accessed simultaneously', () => {
    // Generate multiple space IDs
    const spaceIds = Array.from({ length: numberOfSpaces }, () => uuidv4());
    // Add to tracking array for cleanup
    createdSpaceIds.push(...spaceIds);

    cy.log(`Creating and accessing ${numberOfSpaces} spaces simultaneously`);

    // First create all spaces
    const createSpacePromises: Array<Promise<any>> = [];

    cy.window()
      .then((win) => {
        // Create spaces using XMLHttpRequest for parallel execution
        spaceIds.forEach((id) => {
          createSpacePromises.push(
            new Promise((resolve) => {
              const xhr = new win.XMLHttpRequest();
              xhr.open('POST', '/api/spaces/space');
              xhr.setRequestHeader('kbn-xsrf', 'true');
              xhr.setRequestHeader('Content-Type', 'application/json');
              xhr.onload = () => resolve({ id, status: xhr.status });
              xhr.onerror = () => resolve({ id, error: true });
              xhr.send(
                JSON.stringify({
                  id,
                  name: id,
                  disabledFeatures: [],
                })
              );

              cy.visit(
                `/s/${id}/app/management/kibana/securityAiAssistantManagement?tab=anonymization`
              );
            })
          );
        });

        return Promise.all(createSpacePromises);
      })
      .then((results) => {
        // Log space creation results
        results.forEach((result) => {
          if (result.error) {
            cy.log(`Failed to create space: ${result.id}`);
          } else {
            cy.log(`Created space: ${result.id} with status: ${result.status}`);
          }
        });

        // Now access anonymization fields in all spaces simultaneously
        return cy.window();
      })
      .then((win) => {
        // Access anonymization fields in all spaces (including the original one)
        const allSpaceIds = [spaceId, ...spaceIds];
        const accessPromises: Array<Promise<any>> = [];

        allSpaceIds.forEach((id) => {
          // Make multiple requests to each space to increase chance of race conditions
          for (let i = 0; i < 3; i++) {
            accessPromises.push(
              new Promise((resolve) => {
                const xhr = new win.XMLHttpRequest();
                xhr.open(
                  'GET',
                  `/s/${id}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`
                );
                xhr.setRequestHeader('kbn-xsrf', 'true');
                xhr.onload = () => resolve({ id, status: xhr.status, attempt: i });
                xhr.onerror = () => resolve({ id, error: true, attempt: i });
                xhr.send();
              })
            );
          }
        });

        return Promise.all(accessPromises);
      })
      .then((results) => {
        // Log access results
        results.forEach((result) => {
          if (result.error) {
            cy.log(`Failed to access space ${result.id} on attempt ${result.attempt}`);
          } else {
            cy.log(
              `Accessed space ${result.id} with status ${result.status} on attempt ${result.attempt}`
            );
          }
        });

        // Check all spaces for the correct number of fields
        const allSpaceIds = [spaceId, ...spaceIds];

        // Verify each space has the correct number of fields
        allSpaceIds.forEach((id) => {
          cy.request({
            method: 'GET',
            url: `/s/${id}/api/security_ai_assistant/anonymization_fields/_find?page=1&per_page=1000`,
            headers: { 'kbn-xsrf': 'true' },
            failOnStatusCode: false, // Don't fail if a space isn't fully initialized yet
          }).then((response) => {
            // Only check if the request was successful
            if (response.status === 200) {
              cy.log(`Space ${id} has ${response.body.total} anonymization fields`);
              expect(response.body.total).to.equal(expectedAnonymizationFieldsCount);
            } else {
              cy.log(
                `Space ${id} returned status ${response.status} - may not be fully initialized`
              );
            }
          });
        });
      });
  });
});
