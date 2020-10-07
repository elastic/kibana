/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// a11y tests for spaces, space selection and spacce creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'settings']);
  const a11y = getService('a11y');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');

  describe('Kibana roles page a11y tests', () => {
    before(async () => {
      await PageObjects.security.clickElasticsearchRoles();
    });

    it('a11y test for Roles main page', async () => {
      await a11y.testAppSnapshot();
    });

    it('a11y test for searching a user', async () => {
      await testSubjects.setValue('searchRoles', 'apm_user');
      await a11y.testAppSnapshot();
      await testSubjects.setValue('searchRoles', '');
    });

    it('a11y test for toggle button for show reserved users only', async () => {
      await retry.waitFor(
        'show reserved roles toggle button is visible',
        async () => await testSubjects.exists('showReservedRolesSwitch')
      );
      await testSubjects.click('showReservedRolesSwitch');
      await a11y.testAppSnapshot();
      await testSubjects.click('showReservedRolesSwitch');
    });

    it('a11y test for creating a role form', async () => {
      await testSubjects.click('createRoleButton');
      await a11y.testAppSnapshot();
    });

    it('a11y test for show/hide privilege toggle button', async () => {
      await testSubjects.click('showHidePrivilege');
      await a11y.testAppSnapshot();
      await testSubjects.click('showHidePrivilege');
    });

    it('a11y test for cluster privileges drop down', async () => {
      await testSubjects.click('cluster-privileges-combobox');
      await a11y.testAppSnapshot();
    });

    it('a11y test for grant access to fields toggle switch', async () => {
      await testSubjects.click('restrictFieldsQuery0');
      await a11y.testAppSnapshot();
    });

    it('a11y test for grant read privilege access box', async () => {
      await testSubjects.click('restrictFieldsQuery0');
      await a11y.testAppSnapshot();
    });

    it('a11y test for Kibana privileges panel-space privilege panel', async () => {
      await testSubjects.click('addSpacePrivilegeButton');
      await a11y.testAppSnapshot();
    });

    it('a11y test for customize feature privilege', async () => {
      await testSubjects.click('featureCategory_kibana');
      await a11y.testAppSnapshot();
      await testSubjects.click('cancelSpacePrivilegeButton');
    });

    it('a11y test for role page after inputs', async () => {
      await PageObjects.security.clickElasticsearchRoles();
      await PageObjects.security.addRole('a11yRole', {
        elasticsearch: {
          indices: [
            {
              names: ['logstash-*'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
        },
        kibana: {
          global: ['all'],
        },
      });
      await a11y.testAppSnapshot();
    });

    it('a11y test for deleting a role', async () => {
      await PageObjects.security.clickElasticsearchRoles();

      await a11y.testAppSnapshot();
    });
  });
}
