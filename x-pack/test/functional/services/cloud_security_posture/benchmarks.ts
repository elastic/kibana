/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';
import expect from '@kbn/expect';

export function BenchmarksProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);

  /** Actions */
  const filterBenchmarks = (value: string) =>
    testSubjects.setValue('benchmark-search-field', value);

  const setPageSize = async (size: 10 | 25) => {
    await testSubjects.click('tablePaginationPopoverButton');
    await testSubjects.click(`tablePagination-${size}-rows`);
  };

  const toggleSortByName = async () => {
    // TODO: use custom test subject
    await testSubjects.click('tableHeaderCell_package_policy.name_0');
  };

  /** Navigation */
  const goToBenchmarkPage = () =>
    PageObjects.common.navigateToUrl('securitySolution', 'cloud_security_posture/benchmarks', {
      shouldUseHashForSubUrl: false,
    });

  const goToNextPage = async () => {
    await testSubjects.click('pagination-button-next');
    await testSubjects.isEnabled('pagination-button-0');
  };

  const goToPreviousPage = async () => {
    await testSubjects.click('pagination-button-previous');
    await testSubjects.isEnabled('pagination-button-1');
  };

  const goToNewIntegrationPage = async () => {
    await testSubjects.click('csp_add_integration');
    // TODO: verify we got there in Fleet
  };

  const goToIntegrationRulesPage = () =>
    retry.try(async () => {
      await testSubjects.click('benchmarks-table-column-integration');
      await testSubjects.existOrFail('csp_rules_container', { timeout: 10000 });
    });

  const goToIntegrationAgentPolicyPage = async () => {
    retry.try(async () => {
      await testSubjects.click('benchmarks-table-column-integration_type');
      await testSubjects.existOrFail('csp_rules_container', { timeout: 10000 });
    });
    // TODO: verify we got there
  };

  /** Assertions  */
  const assertIntegrationCountExists = (visible: number, total: number) =>
    retry.try(async () => {
      await testSubjects.existOrFail('benchmark-integrations-count');
      const text = await (await testSubjects.find('benchmark-integrations-count')).getVisibleText();
      expect(text).to.be(`Showing ${visible} of ${total} integration${total > 1 ? 's' : ''}`);
    });

  const assertEmptyPromptExists = () =>
    retry.try(async () => {
      await testSubjects.existOrFail('cloud_posture_page_package_not_installed', {
        timeout: 10000,
      });
    });

  const assertTableColumnValueExists = (column: string, value: string) =>
    retry.try(async () => {
      expect(await testSubjects.getVisibleText(column)).to.be(value);
    });

  const assertBenchmarkPageExists = () =>
    retry.try(async () => {
      await testSubjects.existOrFail('benchmarks-page-header', { timeout: 10000 });
      await testSubjects.existOrFail('csp_benchmarks_table', { timeout: 10000 });
    });

  const assertIntegrationNameRowNumber = async (number: number, value: string) =>
    retry.try(async () => {
      const rows = await testSubjects.findAll('benchmarks-table-column-integration');
      expect(await rows[number].getVisibleText()).to.be(value);
    });

  return {
    toggleSortByName,
    filterBenchmarks,
    setPageSize,
    goToBenchmarkPage,
    goToNewIntegrationPage,
    goToIntegrationRulesPage,
    goToIntegrationAgentPolicyPage,
    goToNextPage,
    goToPreviousPage,
    assertBenchmarkPageExists,
    assertIntegrationCountExists,
    assertEmptyPromptExists,
    assertTableColumnValueExists,
    assertIntegrationNameRowNumber,
  };
}
