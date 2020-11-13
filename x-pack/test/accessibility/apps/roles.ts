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
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.security.clickElasticsearchRoles();
    });

    after(async () => {
      await esArchiver.unload('logstash_functional');
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

    it('a11y test for view privilege summary panel', async () => {
      await PageObjects.security.clickElasticsearchRoles();
      await testSubjects.click('edit-role-action-global_canvas_all');
      await testSubjects.click('viewPrivilegeSummaryButton');

      await a11y.testAppSnapshot();
      await testSubjects.click('euiFlyoutCloseButton');
      await testSubjects.click('roleFormCancelButton');
    });

    it('a11y test for select and delete a role in roles listing table', async () => {
      await testSubjects.click('checkboxSelectRow-antimeridian_points_reader');
      await a11y.testAppSnapshot();
      await testSubjects.click('deleteRoleButton');
      await a11y.testAppSnapshot();
      await testSubjects.click('confirmModalCancelButton');
    });
  });
}
