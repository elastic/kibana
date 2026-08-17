/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getESCategoryKibanaPrivileges,
  getManagementCategoryKibanaPrivileges,
  getObservabilityCategoryKibanaPrivileges,
  getSecuritySolutionCategoryKibanaPrivileges,
  navigateToRolePage,
  openKibanaFeaturePrivilegesFlyout,
  setKibanaPrivilegeSpace,
  setRoleName,
} from '../../../screens/stack_management/role_page';
import { login, ROLE } from '../../../tasks/login';
import { createSpace } from '../../../tasks/spaces';

// In Serverless MKI we use `admin` for the login user... other deployments use system indices superuser
const loginUser = Cypress.env('CLOUD_SERVERLESS') ? ROLE.admin : ROLE.system_indices_superuser;
const roleName = `test_${Math.random().toString().substring(2, 6)}`;
let spaceId: string = '';

describe(
  'Feature Categories',
  {
    tags: ['@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        productTypes: [{ product_line: 'security', product_tier: 'complete' }],
      },
    },
  },
  () => {
    before(() => {
      login(loginUser);
      createSpace(`foo_${Math.random().toString().substring(2, 6)}`).then((response) => {
        spaceId = response.body.id;
      });
    });

    beforeEach(() => {
      login(loginUser);
      navigateToRolePage();
      setRoleName(roleName);
      openKibanaFeaturePrivilegesFlyout();
      setKibanaPrivilegeSpace(spaceId);
    });
    it('should not have o11y and Elasticsearch feature categories', () => {
      getSecuritySolutionCategoryKibanaPrivileges().should('be.visible');
      getManagementCategoryKibanaPrivileges().should('be.visible');
      getObservabilityCategoryKibanaPrivileges().should('not.exist');
      getESCategoryKibanaPrivileges().should('not.exist');
    });
  }
);
