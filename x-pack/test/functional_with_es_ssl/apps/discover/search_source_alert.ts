/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');
  const monacoEditor = getService('monacoEditor');
  const PageObjects = getPageObjects([
    'settings',
    'common',
    'header',
    'discover',
    'timePicker',
    'dashboard',
  ]);
  const deployment = getService('deployment');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const queryBar = getService('queryBar');
  const security = getService('security');
  const filterBar = getService('filterBar');
  const find = getService('find');
  const toasts = getService('toasts');

  const SOURCE_DATA_INDEX = 'search-source-alert';
  const OUTPUT_DATA_INDEX = 'search-source-alert-output';
  const ACTION_TYPE_ID = '.index';
  const RULE_NAME = 'test-search-source-alert';
  let sourceDataViewId: string;
  let sourceAdHocDataViewId: string;
  let outputDataViewId: string;
  let connectorId: string;

  const createSourceIndex = () =>
    es.index({
      index: SOURCE_DATA_INDEX,
      body: {
        settings: { number_of_shards: 1 },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            message: { type: 'keyword' },
          },
        },
      },
    });

  const generateNewDocs = async (docsNumber: number) => {
    const mockMessages = Array.from({ length: docsNumber }, (_, i) => `msg-${i}`);
    const dateNow = new Date().toISOString();
    for await (const message of mockMessages) {
      es.transport.request({
        path: `/${SOURCE_DATA_INDEX}/_doc`,
        method: 'POST',
        body: {
          '@timestamp': dateNow,
          message,
        },
      });
    }
  };

  const createOutputDataIndex = () =>
    es.index({
      index: OUTPUT_DATA_INDEX,
      body: {
        settings: {
          number_of_shards: 1,
        },
        mappings: {
          properties: {
            rule_id: { type: 'text' },
            rule_name: { type: 'text' },
            alert_id: { type: 'text' },
            context_message: { type: 'text' },
          },
        },
      },
    });

  const deleteAlerts = (alertIds: string[]) =>
    asyncForEach(alertIds, async (alertId: string) => {
      await supertest
        .delete(`/api/alerting/rule/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
    });

  const getAlertsByName = async (name: string) => {
    const {
      body: { data: alerts },
    } = await supertest
      .get(`/api/alerting/rules/_find?search=${name}&search_fields=name`)
      .expect(200);

    return alerts;
  };

  const createDataView = async (dataView: string) => {
    log.debug(`create data view ${dataView}`);
    return await supertest
      .post(`/api/data_views/data_view`)
      .set('kbn-xsrf', 'foo')
      .send({ data_view: { title: dataView, timeFieldName: '@timestamp' } })
      .expect(200);
  };

  const deleteDataView = async (dataViewId: string) => {
    return await supertest
      .delete(`/api/data_views/data_view/${dataViewId}`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  };

  const deleteIndexes = (indexes: string[]) => {
    indexes.forEach((current) => {
      es.transport.request({
        path: `/${current}`,
        method: 'DELETE',
      });
    });
  };

  const createConnector = async (): Promise<string> => {
    const { body: createdAction } = await supertest
      .post(`/api/actions/connector`)
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'search-source-alert-test-connector',
        connector_type_id: ACTION_TYPE_ID,
        config: { index: OUTPUT_DATA_INDEX },
        secrets: {},
      })
      .expect(200);

    return createdAction.id;
  };

  const deleteConnector = (id: string) =>
    supertest.delete(`/api/actions/connector/${id}`).set('kbn-xsrf', 'foo').expect(204, '');

  const defineSearchSourceAlert = async (alertName: string) => {
    await retry.waitFor('rule name value is correct', async () => {
      await testSubjects.setValue('ruleNameInput', alertName);
      const ruleName = await testSubjects.getAttribute('ruleNameInput', 'value');
      return ruleName === alertName;
    });
    await testSubjects.click('thresholdPopover');
    await testSubjects.setValue('alertThresholdInput', '3');
    await retry.waitFor('actions accordion to exist', async () => {
      await testSubjects.click('.index-alerting-ActionTypeSelectOption');
      return await testSubjects.exists('alertActionAccordion-0');
    });

    await monacoEditor.setCodeEditorValue(`{
      "rule_id": "{{ruleId}}",
      "rule_name": "{{ruleName}}",
      "alert_id": "{{alertId}}",
      "context_message": "{{context.message}}"
    }`);
  };

  const openDiscoverAlertFlyout = async () => {
    await testSubjects.click('discoverAlertsButton');
    await testSubjects.click('discoverCreateAlertButton');
  };

  const openManagementAlertFlyout = async () => {
    await PageObjects.common.navigateToApp('management');
    await PageObjects.header.waitUntilLoadingHasFinished();
    await testSubjects.click('triggersActions');
    await PageObjects.header.waitUntilLoadingHasFinished();
    await testSubjects.click('createFirstRuleButton');
    await PageObjects.header.waitUntilLoadingHasFinished();
    await testSubjects.click('.es-query-SelectOption');
    await PageObjects.header.waitUntilLoadingHasFinished();
    await testSubjects.click('queryFormType_searchSource');
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const getResultsLink = async () => {
    // getting the link
    await dataGrid.clickRowToggle();
    await testSubjects.click('collapseBtn');
    const contextMessageElement = await testSubjects.find('tableDocViewRow-context_message-value');
    const contextMessage = await contextMessageElement.getVisibleText();
    const [, link] = contextMessage.split(`Link\: `);

    return link;
  };

  const openAlertResults = async (ruleName: string, dataViewId?: string) => {
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.discover.clickNewSearchButton(); // reset params

    await PageObjects.discover.selectIndexPattern(OUTPUT_DATA_INDEX);

    const [{ id: alertId }] = await getAlertsByName(ruleName);
    await filterBar.addFilter('alert_id', 'is', alertId);
    await PageObjects.discover.waitUntilSearchingHasFinished();

    const link = await getResultsLink();
    await filterBar.removeFilter('alert_id'); // clear filter bar

    // follow url provided by alert to see documents triggered the alert
    const baseUrl = deployment.getHostPort();
    await browser.navigateTo(baseUrl + link);
    await PageObjects.discover.waitUntilSearchingHasFinished();

    await retry.waitFor('navigate to discover', async () => {
      const currentDataViewId = await PageObjects.discover.getCurrentDataViewId();
      return dataViewId ? currentDataViewId === dataViewId : true;
    });
  };

  const openAlertRuleInManagement = async (ruleName: string) => {
    await PageObjects.common.navigateToApp('management');
    await PageObjects.header.waitUntilLoadingHasFinished();

    await testSubjects.click('triggersActions');
    await PageObjects.header.waitUntilLoadingHasFinished();

    const rulesList = await testSubjects.find('rulesList');
    const alertRule = await rulesList.findByCssSelector(`[title="${ruleName}"]`);
    await alertRule.click();
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  describe('Search source Alert', () => {
    before(async () => {
      await security.testUser.setRoles(['discover_alert']);

      log.debug('create source indices');
      await createSourceIndex();

      log.debug('generate documents');
      await generateNewDocs(5);

      log.debug('create output index');
      await createOutputDataIndex();

      log.debug('create connector');
      connectorId = await createConnector();
    });

    after(async () => {
      deleteIndexes([OUTPUT_DATA_INDEX, SOURCE_DATA_INDEX]);
      await deleteDataView(outputDataViewId);
      await deleteConnector(connectorId);
      const alertsToDelete = await getAlertsByName('test');
      await deleteAlerts(alertsToDelete.map((alertItem: { id: string }) => alertItem.id));
      await security.testUser.restoreDefaults();
    });

    it('should create an alert when there is no data view', async () => {
      await openManagementAlertFlyout();

      // should not have data view selected by default
      const dataViewSelector = await testSubjects.find('selectDataViewExpression');
      expect(await dataViewSelector.getVisibleText()).to.eql('DATA VIEW\nSelect a data view');

      log.debug('create data views');
      const sourceDataViewResponse = await createDataView(SOURCE_DATA_INDEX);
      const outputDataViewResponse = await createDataView(OUTPUT_DATA_INDEX);

      sourceDataViewId = sourceDataViewResponse.body.data_view.id;
      outputDataViewId = outputDataViewResponse.body.data_view.id;
    });

    it('should show time field validation error', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.selectIndexPattern(SOURCE_DATA_INDEX);
      await PageObjects.timePicker.setCommonlyUsedTime('Last_15 minutes');

      await openDiscoverAlertFlyout();
      await defineSearchSourceAlert(RULE_NAME);
      await testSubjects.click('selectDataViewExpression');

      await testSubjects.click('indexPattern-switcher--input');
      const input = await find.activeElement();
      // search-source-alert-output index does not have time field
      await input.type('search-source-alert-o*');
      await testSubjects.click('explore-matching-indices-button');

      await testSubjects.click('saveRuleButton');

      const errorElem = await testSubjects.find('esQueryAlertExpressionError');
      const errorText = await errorElem.getVisibleText();
      expect(errorText).to.eql('Data view should have a time field.');
    });

    it('should navigate to alert results via view in app link', async () => {
      await testSubjects.click('selectDataViewExpression');
      await testSubjects.click('indexPattern-switcher--input');
      const dataViewsElem = await testSubjects.find('euiSelectableList');
      const sourceDataViewOption = await dataViewsElem.findByCssSelector(
        `[title="${SOURCE_DATA_INDEX}"]`
      );
      await sourceDataViewOption.click();

      await testSubjects.click('saveRuleButton');

      await PageObjects.header.waitUntilLoadingHasFinished();

      await openAlertRuleInManagement(RULE_NAME);
      await testSubjects.click('ruleDetails-viewInApp');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitFor('navigate to discover', async () => {
        const currentDataViewId = await PageObjects.discover.getCurrentDataViewId();
        return sourceDataViewId ? currentDataViewId === sourceDataViewId : true;
      });

      expect(await dataGrid.getDocCount()).to.be(5);
    });

    it('should navigate to alert results via link provided in notification', async () => {
      await openAlertResults(RULE_NAME, sourceDataViewId);

      expect(await toasts.getToastCount()).to.be.equal(1);
      const content = await toasts.getToastContent(1);
      expect(content).to.equal(
        `Displayed documents may vary\nThe displayed documents might differ from the documents that triggered the alert. Some documents might have been added or deleted.`
      );

      const selectedDataView = await PageObjects.discover.getCurrentlySelectedDataView();
      expect(selectedDataView).to.be.equal('search-source-alert');

      expect(await dataGrid.getDocCount()).to.be(5);
    });

    it('should display warning about updated alert rule', async () => {
      await openAlertRuleInManagement(RULE_NAME);

      // change rule configuration
      await testSubjects.click('openEditRuleFlyoutButton');
      await queryBar.setQuery('message:msg-1');
      await filterBar.addFilter('message.keyword', 'is', 'msg-1');

      await testSubjects.click('thresholdPopover');
      await testSubjects.setValue('alertThresholdInput', '1');
      await testSubjects.click('saveEditedRuleButton');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await openAlertResults(RULE_NAME, sourceDataViewId);

      const queryString = await queryBar.getQueryString();
      const hasFilter = await filterBar.hasFilter('message.keyword', 'msg-1');
      expect(queryString).to.be.equal('message:msg-1');
      expect(hasFilter).to.be.equal(true);

      expect(await toasts.getToastCount()).to.be.equal(1);
      const content = await toasts.getToastContent(1);
      expect(content).to.equal(
        `Alert rule has changed\nThe displayed documents might not match the documents that triggered the alert because the rule configuration changed.`
      );

      expect(await dataGrid.getDocCount()).to.be(1);
    });

    it('should display warning about recently updated data view', async () => {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'management',
        `/kibana/dataViews/dataView/${sourceDataViewId}`,
        undefined
      );
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('tab-sourceFilters');
      await testSubjects.click('fieldFilterInput');

      const input = await find.activeElement();
      await input.type('message');
      await testSubjects.click('addFieldFilterButton');

      await openAlertResults(RULE_NAME, sourceDataViewId);

      expect(await toasts.getToastCount()).to.be(2);
      const firstContent = await toasts.getToastContent(1);
      expect(firstContent).to.equal(
        `Data View has changed\nData view has been updated after the last update of the alert rule.`
      );
      const secondContent = await toasts.getToastContent(2);
      expect(secondContent).to.equal(
        `Alert rule has changed\nThe displayed documents might not match the documents that triggered the alert because the rule configuration changed.`
      );

      expect(await dataGrid.getDocCount()).to.be(1);
    });

    it('should display not found index error', async () => {
      await PageObjects.discover.selectIndexPattern(OUTPUT_DATA_INDEX);

      await deleteDataView(sourceDataViewId);

      // rty to open alert results after index deletion
      await openAlertResults(RULE_NAME);

      expect(await toasts.getToastCount()).to.be(1);
      const firstContent = await toasts.getToastContent(1);
      expect(firstContent).to.equal(
        `Error fetching search source\nCould not locate that data view (id: ${sourceDataViewId}), click here to re-create it`
      );
    });

    it('should navigate to alert results via view in app link using adhoc data view', async () => {
      await PageObjects.discover.createAdHocDataView('search-source-', true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.timePicker.setCommonlyUsedTime('Last_15 minutes');

      await PageObjects.discover.addRuntimeField('runtime-message-field', `emit('mock-message')`);

      // create an alert
      await openDiscoverAlertFlyout();
      await defineSearchSourceAlert('test-adhoc-alert');
      await testSubjects.click('saveRuleButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      sourceAdHocDataViewId = await PageObjects.discover.getCurrentDataViewId();

      // navigate to discover using view in app link
      await openAlertRuleInManagement('test-adhoc-alert');
      await testSubjects.click('ruleDetails-viewInApp');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitFor('navigate to discover', async () => {
        const currentDataViewId = await PageObjects.discover.getCurrentDataViewId();
        return currentDataViewId === sourceAdHocDataViewId;
      });

      const selectedDataView = await PageObjects.discover.getCurrentlySelectedDataView();
      expect(selectedDataView).to.be.equal('search-source-*');

      const documentCell = await dataGrid.getCellElement(0, 3);
      const firstRowContent = await documentCell.getVisibleText();
      expect(firstRowContent.includes('runtime-message-fieldmock-message_id')).to.be.equal(true);
    });

    it('should navigate to alert results via link provided in notification using adhoc data view', async () => {
      await openAlertResults('test-adhoc-alert', sourceAdHocDataViewId);

      expect(await toasts.getToastCount()).to.be.equal(1);
      const content = await toasts.getToastContent(1);
      expect(content).to.equal(
        `Displayed documents may vary\nThe displayed documents might differ from the documents that triggered the alert. Some documents might have been added or deleted.`
      );
      expect(await dataGrid.getDocCount()).to.be(5);

      const selectedDataView = await PageObjects.discover.getCurrentlySelectedDataView();
      expect(selectedDataView).to.be.equal('search-source-*');
    });
  });
}
