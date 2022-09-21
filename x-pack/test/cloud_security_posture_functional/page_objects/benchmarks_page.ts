/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

const BENCHMARK_ROUTE = 'cloud_security_posture/benchmarks';
const SECURITY_SOLUTION_APP_NAME = 'securitySolution';

const TEST_IDS = {
  // Defined in EUI
  PAGINATION: 'tablePaginationPopoverButton',
  PAGINATION_SIZE: (size: 10 | 25) => `tablePagination-${size}-rows`,
  PAGINATION_NEXT: 'pagination-button-next',
  PAGINATION_PREV: 'pagination-button-previous',
  PAGINATION_PAGE_0: 'pagination-button-0',
  PAGINATION_PAGE_1: 'pagination-button-1',

  // Defined in CSP Plugin
  RULES_CONTAINER: 'csp_rules_container',
  BENCHMARK_SEARCH: 'benchmark-search-field',
  ADD_INTEGRATION: 'csp_add_integration',
  PAGE_HEADER: 'benchmarks-page-header',
  BENCHMARKS_TABLE: 'csp_benchmarks_table',
  NOT_INSTALLED: 'cloud_posture_page_package_not_installed',
  INTEGRATION_COUNT: 'benchmark-integrations-count',
  INTEGRATION_NAME: 'benchmarks-table-column-integration-name',
  AGENT_POLICY: 'benchmarks-table-column-agent-policy',
};

export function BenchmarksPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);

  const filterBenchmarks = (value: string) =>
    retry.try(() => testSubjects.setValue(TEST_IDS.BENCHMARK_SEARCH, value));

  const setPageSize = (size: 10 | 25) =>
    retry.try(async () => {
      await testSubjects.click(TEST_IDS.PAGINATION);
      await testSubjects.click(TEST_IDS.PAGINATION_SIZE(size));
    });

  const toggleSortByName = async () =>
    // TODO: use custom test subject
    retry.try(() => testSubjects.click('tableHeaderCell_package_policy.name_0'));

  const goToBenchmarkPage = () =>
    PageObjects.common.navigateToUrl(SECURITY_SOLUTION_APP_NAME, BENCHMARK_ROUTE, {
      shouldUseHashForSubUrl: false,
    });

  const goToNextPage = () =>
    retry.try(async () => {
      await testSubjects.click(TEST_IDS.PAGINATION_NEXT);
      await testSubjects.isEnabled(TEST_IDS.PAGINATION_PAGE_0);
    });

  const goToPreviousPage = () =>
    retry.try(async () => {
      await testSubjects.click(TEST_IDS.PAGINATION_PREV);
      await testSubjects.isEnabled(TEST_IDS.PAGINATION_PAGE_1);
    });

  const goToNewIntegrationPage = () =>
    retry.try(() => testSubjects.click(TEST_IDS.ADD_INTEGRATION));

  const goToIntegrationRulesPage = () =>
    retry.try(() => testSubjects.click(TEST_IDS.INTEGRATION_NAME));

  const goToIntegrationAgentPolicyPage = () =>
    retry.try(() => testSubjects.click(TEST_IDS.AGENT_POLICY));

  const assertIntegrationCountExists = (visible: number, total: number) =>
    retry.try(async () => {
      const text = await (await testSubjects.find(TEST_IDS.INTEGRATION_COUNT)).getVisibleText();
      expect(text).to.be(`Showing ${visible} of ${total} integration${total > 1 ? 's' : ''}`);
    });

  const assertRulePageExists = () =>
    retry.try(() => testSubjects.existOrFail(TEST_IDS.RULES_CONTAINER));

  const assertEmptyPromptExists = () =>
    retry.try(() => testSubjects.existOrFail(TEST_IDS.NOT_INSTALLED));

  const assertTableColumnValueExists = (column: string, value: string) =>
    retry.try(async () => {
      expect(await testSubjects.getVisibleText(column)).to.be(value);
    });

  const assertBenchmarkPageExists = () =>
    retry.try(async () => {
      await testSubjects.existOrFail(TEST_IDS.PAGE_HEADER);
      await testSubjects.existOrFail(TEST_IDS.BENCHMARKS_TABLE);
    });

  const assertRowIntegrationName = async (rowNumber: number, name: string) =>
    retry.try(async () => {
      const rows = await testSubjects.findAll(TEST_IDS.INTEGRATION_NAME);
      expect(await rows[rowNumber].getVisibleText()).to.be(name);
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
    assertRowIntegrationName,
    assertRulePageExists,
  };
}
