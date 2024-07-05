/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FunctionalFtrProviderContext } from '../../common/ftr_provider_context';
import {
  VULNERABILITIES_INDEX_DEFAULT_NS,
  VULNERABILITIES_LATEST_INDEX,
} from '../../common/utils/indices';
import { vulnerabilitiesLatestMock } from '../mocks/vulnerabilities_latest_mock';
import { addIndexBulkDocs, deleteIndices } from '../../common/utils/index_api_helpers';
import { setupCSPPackage } from '../../common/utils/csp_package_helpers';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FunctionalFtrProviderContext) {
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const supertest = getService('supertest');
  const es = getService('es');
  const pageObjects = getPageObjects(['common', 'findings', 'header']);

  const resourceName1 = 'name-ng-1-Node';
  const resourceName2 = 'othername-june12-8-8-0-1';

  describe('Vulnerabilities Page - DataTable', function () {
    this.tags(['cloud_security_posture_vulnerabilities']);
    let findings: typeof pageObjects.findings;
    let latestVulnerabilitiesTable: typeof findings.latestVulnerabilitiesTable;

    before(async () => {
      findings = pageObjects.findings;
      latestVulnerabilitiesTable = findings.latestVulnerabilitiesTable;

      // Before we start any test we must wait for cloud_security_posture plugin to complete its initialization
      await setupCSPPackage(retry, log, supertest);

      // Prepare mocked findings
      await deleteIndices(es, [VULNERABILITIES_INDEX_DEFAULT_NS, VULNERABILITIES_LATEST_INDEX]);
      await addIndexBulkDocs(es, vulnerabilitiesLatestMock, [
        VULNERABILITIES_INDEX_DEFAULT_NS,
        VULNERABILITIES_LATEST_INDEX,
      ]);

      await findings.navigateToLatestVulnerabilitiesPage();
      await retry.waitFor(
        'Findings table to be loaded',
        async () =>
          (await latestVulnerabilitiesTable.getRowsCount()) === vulnerabilitiesLatestMock.length
      );
      pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await deleteIndices(es, [VULNERABILITIES_INDEX_DEFAULT_NS, VULNERABILITIES_LATEST_INDEX]);
    });

    describe('SearchBar', () => {
      it('add filter', async () => {
        // Filter bar uses the field's customLabel in the DataView
        await filterBar.addFilter({
          field: 'Resource Name',
          operation: 'is',
          value: resourceName1,
        });

        expect(await filterBar.hasFilter('resource.name', resourceName1)).to.be(true);
        expect(
          await latestVulnerabilitiesTable.hasColumnValue('resource.name', resourceName1)
        ).to.be(true);
      });

      it('remove filter', async () => {
        await filterBar.removeFilter('resource.name');

        expect(await filterBar.hasFilter('resource.name', resourceName1)).to.be(false);
        expect(await latestVulnerabilitiesTable.getRowsCount()).to.be(
          vulnerabilitiesLatestMock.length
        );
      });

      it('set search query', async () => {
        await queryBar.setQuery(resourceName1);
        await queryBar.submitQuery();

        expect(
          await latestVulnerabilitiesTable.hasColumnValue('resource.name', resourceName1)
        ).to.be(true);
        expect(
          await latestVulnerabilitiesTable.hasColumnValue('resource.name', resourceName2)
        ).to.be(false);

        await queryBar.setQuery('');
        await queryBar.submitQuery();

        expect(await latestVulnerabilitiesTable.getRowsCount()).to.be(
          vulnerabilitiesLatestMock.length
        );
      });
    });

    describe('DataTable features', () => {
      it('Edit data view field option is Enabled', async () => {
        await latestVulnerabilitiesTable.toggleEditDataViewFieldsOption('vulnerability.id');
        expect(await testSubjects.find('gridEditFieldButton')).to.be.ok();
        await latestVulnerabilitiesTable.toggleEditDataViewFieldsOption('vulnerability.id');
      });
    });

    describe('Vulnerabilities - Fields selector', () => {
      const CSP_FIELDS_SELECTOR_MODAL = 'cloudSecurityFieldsSelectorModal';
      const CSP_FIELDS_SELECTOR_OPEN_BUTTON = 'cloudSecurityFieldsSelectorOpenButton';
      const CSP_FIELDS_SELECTOR_RESET_BUTTON = 'cloudSecurityFieldsSelectorResetButton';
      const CSP_FIELDS_SELECTOR_CLOSE_BUTTON = 'cloudSecurityFieldsSelectorCloseButton';

      it('Add fields to the Vulnerabilities DataTable', async () => {
        const fieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_OPEN_BUTTON);
        await fieldsButton.click();
        await testSubjects.existOrFail(CSP_FIELDS_SELECTOR_MODAL);

        const agentIdCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.id'
        );
        await agentIdCheckbox.click();

        const agentNameCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.name'
        );
        await agentNameCheckbox.click();

        await testSubjects.existOrFail('dataGridHeaderCell-agent.id');
        await testSubjects.existOrFail('dataGridHeaderCell-agent.name');

        const closeFieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_CLOSE_BUTTON);
        await closeFieldsButton.click();
        await testSubjects.missingOrFail(CSP_FIELDS_SELECTOR_MODAL);
      });

      it('Remove fields from the Vulnerabilities DataTable', async () => {
        const fieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_OPEN_BUTTON);
        await fieldsButton.click();

        const agentIdCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.id'
        );
        await agentIdCheckbox.click();

        const agentNameCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.name'
        );
        await agentNameCheckbox.click();

        await testSubjects.missingOrFail('dataGridHeaderCell-agent.id');
        await testSubjects.missingOrFail('dataGridHeaderCell-agent.name');

        const closeFieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_CLOSE_BUTTON);
        await closeFieldsButton.click();
        await testSubjects.missingOrFail(CSP_FIELDS_SELECTOR_MODAL);
      });
      it('Reset fields to default', async () => {
        const fieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_OPEN_BUTTON);
        await fieldsButton.click();

        const agentIdCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.id'
        );
        await agentIdCheckbox.click();

        const agentNameCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.name'
        );
        await agentNameCheckbox.click();

        await testSubjects.existOrFail('dataGridHeaderCell-agent.id');
        await testSubjects.existOrFail('dataGridHeaderCell-agent.name');

        const resetFieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_RESET_BUTTON);
        await resetFieldsButton.click();

        await testSubjects.missingOrFail('dataGridHeaderCell-agent.id');
        await testSubjects.missingOrFail('dataGridHeaderCell-agent.name');

        const closeFieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_CLOSE_BUTTON);
        await closeFieldsButton.click();
        await testSubjects.missingOrFail(CSP_FIELDS_SELECTOR_MODAL);
      });
    });
  });
}
