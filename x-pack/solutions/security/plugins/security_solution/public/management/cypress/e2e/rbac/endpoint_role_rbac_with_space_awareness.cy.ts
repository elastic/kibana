/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, ROLE } from '../../tasks/login';
import { createSpace, deleteSpace } from '../../tasks/spaces';
import {
  clickEndpointSubFeaturePrivilegesCustomization,
  clickFlyoutAddKibanaPrivilegeButton,
  clickRoleSaveButton,
  clickViewPrivilegeSummaryButton,
  ENDPOINT_SUB_FEATURE_PRIVILEGE_IDS,
  expandEndpointSecurityFeaturePrivileges,
  expandSecuritySolutionCategoryKibanaPrivileges,
  navigateToRolePage,
  openKibanaFeaturePrivilegesFlyout,
  setEndpointSubFeaturePrivilege,
  setKibanaPrivilegeSpace,
  setRoleName,
  setSecuritySolutionEndpointGroupPrivilege,
} from '../../screens/stack_management/role_page';

describe(
  'When defining a kibana role for Endpoint security access with space awareness enabled',
  {
    // TODO:PR Remove `'@skipInServerlessMKI` once PR merges to `main` and feature flag is enabled in prod.
    tags: ['@ess', '@serverless', '@serverlessMKI', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'endpointManagementSpaceAwarenessEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    // In Serverless MKI we use `admin` for the login user... other deployments use system indices superuser
    const loginUser = Cypress.env('CLOUD_SERVERLESS') ? ROLE.admin : ROLE.system_indices_superuser;
    const roleName = `test_${Math.random().toString().substring(2, 6)}`;
    let spaceId: string = '';

    before(() => {
      login(loginUser);
      createSpace(`foo_${Math.random().toString().substring(2, 6)}`).then((response) => {
        spaceId = response.body.id;
      });
    });

    after(() => {
      if (spaceId) {
        deleteSpace(spaceId);
        spaceId = '';
      }
    });

    beforeEach(() => {
      login(loginUser);
      navigateToRolePage();
      setRoleName(roleName);
      openKibanaFeaturePrivilegesFlyout();
      setKibanaPrivilegeSpace(spaceId);
      expandSecuritySolutionCategoryKibanaPrivileges();
      expandEndpointSecurityFeaturePrivileges();
    });

    it('should allow configuration per-space', () => {
      setSecuritySolutionEndpointGroupPrivilege('all');
      clickEndpointSubFeaturePrivilegesCustomization();
      setEndpointSubFeaturePrivilege('endpoint_list', 'all');
      setEndpointSubFeaturePrivilege('host_isolation', 'all');
      clickFlyoutAddKibanaPrivilegeButton();
      clickRoleSaveButton();

      navigateToRolePage(roleName);
      clickViewPrivilegeSummaryButton();
      cy.getByTestSubj('expandPrivilegeSummaryRow').click({ multiple: true });

      cy.getByTestSubj('privilegeSummaryFeatureCategory_securitySolution')
        .findByTestSubj(`space-avatar-${spaceId}`)
        .should('exist');

      cy.get('#row_siemV2_expansion')
        .findByTestSubj('subFeatureEntry')
        .then(($element) => {
          const features: string[] = [];

          $element.each((_, $subFeature) => {
            features.push($subFeature.textContent ?? '');
          });

          return features;
        })
        // Using `include.members` here because in serverless, an additional privilege shows
        // up in this list - `Endpoint exceptions`.
        .should('include.members', [
          'Endpoint ListAll',
          'Trusted ApplicationsNone',
          'Host Isolation ExceptionsNone',
          'BlocklistNone',
          'Event FiltersNone',
          'Global Artifact ManagementNone',
          'Elastic Defend Policy ManagementNone',
          'Response Actions HistoryNone',
          'Host IsolationAll',
          'Process OperationsNone',
          'File OperationsNone',
          'Execute OperationsNone',
          'Scan OperationsNone',
        ]);
    });

    it('should not display the privilege tooltip', () => {
      ENDPOINT_SUB_FEATURE_PRIVILEGE_IDS.forEach((subFeaturePrivilegeId) => {
        cy.getByTestSubj(`securitySolution_siemV2_${subFeaturePrivilegeId}_nameTooltip`).should(
          'not.exist'
        );
      });
    });

    it('should include new Global Artifact Management privilege', () => {
      cy.getByTestSubj('securitySolution_siemV2_global_artifact_management').should('exist');
    });
  }
);
