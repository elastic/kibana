/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../../ftr_provider_context';

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
  const kibanaServer = getService('kibanaServer');

  const SOURCE_DATA_VIEW = 'search-source-alert';
  const OUTPUT_DATA_VIEW = 'search-source-alert-output';
  const ACTION_TYPE_ID = '.index';
  const RULE_NAME = 'test-search-source-alert';
  const ADHOC_RULE_NAME = 'test-adhoc-alert';
  let outputDataViewId: string;
  let connectorId: string;

  const createSourceIndex = () =>
    es.index({
      index: SOURCE_DATA_VIEW,
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
    const dateNow = new Date();
    const dateToSet = new Date(dateNow);
    dateToSet.setMinutes(dateNow.getMinutes() - 10);
    for await (const message of mockMessages) {
      es.transport.request({
        path: `/${SOURCE_DATA_VIEW}/_doc`,
        method: 'POST',
        body: {
          '@timestamp': dateToSet.toISOString(),
          message,
        },
      });
    }
  };

  const createOutputDataIndex = () =>
    es.index({
      index: OUTPUT_DATA_VIEW,
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
        config: { index: OUTPUT_DATA_VIEW },
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
    await testSubjects.setValue('alertThresholdInput', '1');

    await testSubjects.click('forLastExpression');
    await testSubjects.setValue('timeWindowSizeNumber', '30');

    await retry.waitFor('actions accordion to exist', async () => {
      await testSubjects.click('.index-alerting-ActionTypeSelectOption');
      return await testSubjects.exists('alertActionAccordion-0');
    });

    await monacoEditor.setCodeEditorValue(`{
      "rule_id": "{{rule.id}}",
      "rule_name": "{{rule.name}}",
      "alert_id": "{{alert.id}}",
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

  const checkInitialRuleParamsState = async (dataView: string, isViewInApp = false) => {
    if (isViewInApp) {
      expect(await toasts.getToastCount()).to.be(0);
    } else {
      expect(await toasts.getToastCount()).to.be(1);
      expect((await toasts.getToastContent(1)).startsWith('Displayed documents may vary')).to.be(
        true
      );
    }
    expect(await filterBar.getFilterCount()).to.be(0);
    expect(await queryBar.getQueryString()).to.equal('');
    const selectedDataView = await PageObjects.discover.getCurrentlySelectedDataView();
    const { valid } = await PageObjects.discover.validateDataViewReffsEquality();
    expect(valid).to.equal(true);
    expect(selectedDataView).to.be.equal(dataView);
    expect(await dataGrid.getDocCount()).to.be(5);
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
      deleteIndexes([OUTPUT_DATA_VIEW, SOURCE_DATA_VIEW]);
      const [{ id: adhocRuleId }] = await getAlertsByName(ADHOC_RULE_NAME);
      await deleteAlerts([adhocRuleId]);
      await deleteDataView(outputDataViewId);
      await deleteConnector(connectorId);
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should create an alert when there is no data view', async () => {
      await openManagementAlertFlyout();

      // should not have data view selected by default
      const dataViewSelector = await testSubjects.find('selectDataViewExpression');
      expect(await dataViewSelector.getVisibleText()).to.eql('DATA VIEW\nSelect a data view');

      log.debug('create data views');
      const outputDataViewResponse = await createDataView(OUTPUT_DATA_VIEW);

      outputDataViewId = outputDataViewResponse.body.data_view.id;
    });

    it('should show time field validation error', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.selectIndexPattern(SOURCE_DATA_VIEW);
      await PageObjects.timePicker.setCommonlyUsedTime('Last_15 minutes');

      await openDiscoverAlertFlyout();
      await defineSearchSourceAlert(RULE_NAME);
      await testSubjects.click('selectDataViewExpression');

      await testSubjects.click('indexPattern-switcher--input');
      const input = await find.activeElement();
      // search-source-alert-output index does not have time field
      await input.type('search-source-alert-o*');
      await testSubjects.click('explore-matching-indices-button');

      await retry.waitFor('selection to happen', async () => {
        const dataViewSelector = await testSubjects.find('selectDataViewExpression');
        return (await dataViewSelector.getVisibleText()) === 'DATA VIEW\nsearch-source-alert-o*';
      });

      await testSubjects.click('saveRuleButton');

      const errorElem = await testSubjects.find('esQueryAlertExpressionError');
      const errorText = await errorElem.getVisibleText();
      expect(errorText).to.eql('Data view should have a time field.');
    });

    it('should navigate to alert results via view in app link', async () => {
      await testSubjects.click('selectDataViewExpression');
      await testSubjects.click('indexPattern-switcher--input');
      if (await testSubjects.exists('clearSearchButton')) {
        await testSubjects.click('clearSearchButton');
      }
      const dataViewsElem = await testSubjects.find('euiSelectableList');
      const sourceDataViewOption = await dataViewsElem.findByCssSelector(
        `[title="${SOURCE_DATA_VIEW}"]`
      );
      await sourceDataViewOption.click();

      await testSubjects.click('saveRuleButton');

      await PageObjects.header.waitUntilLoadingHasFinished();

      await openAlertRuleInManagement(RULE_NAME);
      await testSubjects.click('ruleDetails-viewInApp');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await checkInitialRuleParamsState(SOURCE_DATA_VIEW, true);
    });

    it('should check that there are no errors detected after an alert is created', async () => {
      const newAlert = 'New Alert for checking its status';
      await createDataView('search-source*');

      await PageObjects.common.navigateToApp('management');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('triggersActions');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('createRuleButton');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitFor('rule name value is correct', async () => {
        await testSubjects.setValue('ruleNameInput', newAlert);
        const ruleName = await testSubjects.getAttribute('ruleNameInput', 'value');
        return ruleName === newAlert;
      });

      await testSubjects.click('.es-query-SelectOption');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('queryFormType_searchSource');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('selectDataViewExpression');
      await testSubjects.click('indexPattern-switcher--input');
      if (await testSubjects.exists('clearSearchButton')) {
        await testSubjects.click('clearSearchButton');
      }
      const dataViewsElem = await testSubjects.find('euiSelectableList');
      const sourceDataViewOption = await dataViewsElem.findByCssSelector(
        `[title="search-source*"]`
      );
      await sourceDataViewOption.click();

      await testSubjects.click('saveRuleButton');

      await retry.waitFor('confirmation modal', async () => {
        return await testSubjects.exists('confirmModalConfirmButton');
      });

      await testSubjects.click('confirmModalConfirmButton');

      await PageObjects.header.waitUntilLoadingHasFinished();

      await openAlertRuleInManagement(newAlert);

      await retry.waitFor('success status', async () => {
        await browser.refresh();
        await PageObjects.header.waitUntilLoadingHasFinished();

        return await testSubjects.exists('ruleStatus-ok');
      });
    });
  });
}
