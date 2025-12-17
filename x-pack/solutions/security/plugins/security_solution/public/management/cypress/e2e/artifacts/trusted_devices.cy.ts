/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import {
  createArtifactList,
  createPerPolicyArtifact,
  removeExceptionsList,
  trustedDevicesFormSelectors,
} from '../../tasks/artifacts';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import { login } from '../../tasks/login';

const {
  openTrustedDevices,
  selectOs,
  selectField,
  selectOperator,
  fillValue,
  fillOutTrustedDevicesFlyout,
  submitForm,
  validateSuccessPopup,
  validateRenderedCondition,
  deleteTrustedDeviceItem,
} = trustedDevicesFormSelectors;

describe(
  'Trusted Devices',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;

    before(() => {
      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version).then((data) => {
          indexedPolicy = data;
        });
      });
    });

    beforeEach(() => {
      login();
    });

    after(() => {
      if (indexedPolicy) {
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
      }
    });

    const createArtifactBodyRequest = () => ({
      list_id: ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
      entries: [
        {
          field: 'user.name',
          operator: 'included',
          type: 'match',
          value: 'test-user',
        },
      ],
      os_types: ['windows'],
    });

    describe('Renders Trusted Devices form fields', () => {
      it('Correctly renders trusted devices form for Windows only with Username field', () => {
        openTrustedDevices({ create: true });

        selectOs('Windows');

        selectField('Username');
        selectOperator('is');
        fillValue('test-user');
      });

      it('Renders all field options correctly for Windows only', () => {
        openTrustedDevices({ create: true });
        selectOs('Windows');

        const fields: Array<'Username' | 'Host' | 'Device ID' | 'Manufacturer' | 'Product ID'> = [
          'Username',
          'Host',
          'Device ID',
          'Manufacturer',
          'Product ID',
        ];

        fields.forEach((field) => {
          selectField(field);
          cy.getByTestSubj('trustedDevices-form-fieldSelect').should('contain', field);
        });
      });

      it('Shows limited field options for Windows and Mac (no Username)', () => {
        openTrustedDevices({ create: true });
        selectOs('Windows and Mac');

        cy.getByTestSubj('trustedDevices-form-fieldSelect').click();

        const availableFields: Array<'Host' | 'Device ID' | 'Manufacturer' | 'Product ID'> = [
          'Host',
          'Device ID',
          'Manufacturer',
          'Product ID',
        ];

        availableFields.forEach((field) => {
          cy.get('[role="option"]').should('contain', field);
        });

        cy.get('[role="option"]').should('not.contain', 'Username');
      });
    });

    describe('Handles CRUD with device fields', () => {
      afterEach(() => {
        removeExceptionsList(ENDPOINT_ARTIFACT_LISTS.trustedDevices.id);
      });

      it('Correctly creates a trusted device with a single username field on Windows only', () => {
        const expectedCondition = /user\.name\s*IS\s*test-user/i;

        openTrustedDevices({ create: true });
        fillOutTrustedDevicesFlyout();
        selectOs('Windows');
        selectField('Username');
        selectOperator('is');
        fillValue('test-user');
        submitForm();

        validateSuccessPopup('create');
        validateRenderedCondition(expectedCondition);
      });

      describe('Correctly updates and deletes trusted device with single username field', () => {
        let itemId: string;

        beforeEach(() => {
          createArtifactList(ENDPOINT_ARTIFACT_LISTS.trustedDevices.id);
          createPerPolicyArtifact('Test Trusted Device', createArtifactBodyRequest()).then(
            (response) => {
              itemId = response.body.item_id;
            }
          );
        });

        it('Updates trusted device username field item', () => {
          const expectedCondition = /user\.name\s*IS\s*updated-user/i;

          openTrustedDevices({ itemId });
          fillValue('updated-user');
          submitForm();

          validateSuccessPopup('update');
          validateRenderedCondition(expectedCondition);
        });

        it('Deletes a trusted device item', () => {
          openTrustedDevices();
          deleteTrustedDeviceItem();
          validateSuccessPopup('delete');
        });
      });
    });
  }
);
