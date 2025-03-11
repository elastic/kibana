/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  expandEndpointSecurityFeaturePrivileges,
  expandSecuritySolutionCategoryKibanaPrivileges,
  navigateToRolePage,
  openKibanaFeaturePrivilegesFlyout,
  setKibanaPrivilegeSpace,
} from '../../screens/stack_management/role_page';
import { closeAllToasts } from '../../tasks/toasts';
import { login, ROLE } from '../../tasks/login';

describe(
  'When defining a kibana role for Endpoint security access',
  {
    tags: '@ess',
  },
  () => {
    const getAllSubFeatureRows = (): Cypress.Chainable<JQuery<HTMLElement>> => {
      return cy
        .get('#featurePrivilegeControls_siemV2')
        .findByTestSubj('mutexSubFeaturePrivilegeControl')
        .closest('.euiFlexGroup');
    };

    beforeEach(() => {
      login(ROLE.system_indices_superuser);
      navigateToRolePage();
      closeAllToasts();

      openKibanaFeaturePrivilegesFlyout();
      setKibanaPrivilegeSpace('default');
      expandSecuritySolutionCategoryKibanaPrivileges();
      expandEndpointSecurityFeaturePrivileges();
    });

    it('should display RBAC entries with expected controls', () => {
      getAllSubFeatureRows()
        .then(($subFeatures) => {
          const featureRows: string[] = [];
          $subFeatures.each((_, $subFeature) => {
            featureRows.push($subFeature.textContent ?? '');
          });

          return featureRows;
        })
        .should('deep.equal', [
          'Endpoint List Displays all hosts running Elastic Defend and their relevant integration details.Endpoint List sub-feature privilegeAllReadNone',
          'Endpoint Insights Access the endpoint insights.Endpoint Insights sub-feature privilegeAllReadNone',
          'Trusted Applications Helps mitigate conflicts with other software, usually other antivirus or endpoint security applications.Trusted Applications sub-feature privilegeAllReadNone',
          'Host Isolation Exceptions Add specific IP addresses that isolated hosts are still allowed to communicate with, even when isolated from the rest of the network.Host Isolation Exceptions sub-feature privilegeAllReadNone',
          'Blocklist Extend Elastic Defend’s protection against malicious processes and protect against potentially harmful applications.Blocklist sub-feature privilegeAllReadNone',
          'Event Filters Filter out endpoint events that you do not need or want stored in Elasticsearch.Event Filters sub-feature privilegeAllReadNone',
          'Elastic Defend Policy Management Access the Elastic Defend integration policy to configure protections, event collection, and advanced policy features.Elastic Defend Policy Management sub-feature privilegeAllReadNone',
          'Response Actions History Access the history of response actions performed on endpoints.Response Actions History sub-feature privilegeAllReadNone',
          'Host Isolation Perform the "isolate" and "release" response actions.Host Isolation sub-feature privilegeAllNone',
          'Process Operations Perform process-related response actions in the response console.Process Operations sub-feature privilegeAllNone',
          'File Operations Perform file-related response actions in the response console.File Operations sub-feature privilegeAllNone',
          'Execute Operations Perform script execution response actions in the response console.Execute Operations sub-feature privilegeAllNone',
          'Scan Operations Perform folder scan response actions in the response console.Scan Operations sub-feature privilegeAllNone',
        ]);
    });

    it('should display all RBAC entries set to None by default', () => {
      getAllSubFeatureRows()
        .findByTestSubj('none')
        .should('have.class', 'euiButtonGroupButton-isSelected');
    });
  }
);
