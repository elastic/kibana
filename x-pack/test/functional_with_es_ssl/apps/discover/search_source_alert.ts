/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { last } from 'lodash';
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

  const SOURCE_DATA_INDEX = 'search-source-alert';
  const OUTPUT_DATA_INDEX = 'search-source-alert-output';
  const ACTION_TYPE_ID = '.index';
  const RULE_NAME = 'test-search-source-alert';
  let sourceDataViewId: string;
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
            message: { type: 'text' },
          },
        },
      },
    });

  const generateNewDocs = async (docsNumber: number) => {
    const mockMessages = new Array(docsNumber).map((current) => `msg-${current}`);
    const dateNow = new Date().toISOString();
    for (const message of mockMessages) {
      await es.transport.request({
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

  const deleteDataViews = (dataViews: string[]) =>
    asyncForEach(
      dataViews,
      async (dataView: string) =>
        await supertest
          .delete(`/api/data_views/data_view/${dataView}`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
    );

  const defineSearchSourceAlert = async (alertName: string) => {
    await testSubjects.click('discoverAlertsButton');
    await testSubjects.click('discoverCreateAlertButton');

    await testSubjects.setValue('ruleNameInput', alertName);
    await testSubjects.click('thresholdPopover');
    await testSubjects.setValue('alertThresholdInput', '3');
    await testSubjects.click('.index-ActionTypeSelectOption');

    await monacoEditor.setCodeEditorValue(`{
      "rule_id": "{{ruleId}}",
      "rule_name": "{{ruleName}}",
      "alert_id": "{{alertId}}",
      "context_message": "{{context.message}}"
    }`);
    await testSubjects.click('saveRuleButton');
  };

  const getLastToast = async () => {
    const toastList = await testSubjects.find('globalToastList');
    const titles = await toastList.findAllByCssSelector('.euiToastHeader');
    const lastTitleElement = last(titles)!;
    const title = await lastTitleElement.getVisibleText();
    const messages = await toastList.findAllByCssSelector('.euiToastBody');
    const lastMessageElement = last(messages)!;
    const message = await lastMessageElement.getVisibleText();
    return { message, title };
  };

  const openOutputIndex = async () => {
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.discover.selectIndexPattern(OUTPUT_DATA_INDEX);

    const [{ id: alertId }] = await getAlertsByName(RULE_NAME);
    await queryBar.setQuery(`alert_id:${alertId}`);
    await retry.waitFor('document explorer contains alert', async () => {
      await queryBar.submitQuery();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      return (await dataGrid.getDocCount()) > 0;
    });
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

  const navigateToDiscover = async (link: string) => {
    // following ling provided by alert to see documents triggered the alert
    const baseUrl = deployment.getHostPort();
    await browser.navigateTo(baseUrl + link);
    await PageObjects.discover.waitUntilSearchingHasFinished();

    await retry.waitFor('navigate to discover', async () => {
      const currentUrl = await browser.getCurrentUrl();
      return currentUrl.includes(sourceDataViewId);
    });
  };

  const navigateToResults = async () => {
    const link = await getResultsLink();
    await navigateToDiscover(link);
  };

  const openAlertRule = async () => {
    await PageObjects.common.navigateToApp('management');
    await PageObjects.header.waitUntilLoadingHasFinished();

    await testSubjects.click('triggersActions');
    await PageObjects.header.waitUntilLoadingHasFinished();

    const rulesList = await testSubjects.find('rulesList');
    const alertRule = await rulesList.findByCssSelector('[title="test-search-source-alert"]');
    await alertRule.click();
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  describe('Search source Alert', () => {
    before(async () => {
      await security.testUser.setRoles(['discover_alert']);

      log.debug('create source index');
      await createSourceIndex();

      log.debug('generate documents');
      await generateNewDocs(5);

      log.debug('create output index');
      await createOutputDataIndex();

      log.debug('create data views');
      const sourceDataViewResponse = await createDataView(SOURCE_DATA_INDEX);
      const outputDataViewResponse = await createDataView(OUTPUT_DATA_INDEX);

      log.debug('create connector');
      connectorId = await createConnector();

      sourceDataViewId = sourceDataViewResponse.body.data_view.id;
      outputDataViewId = outputDataViewResponse.body.data_view.id;
    });

    after(async () => {
      // delete only remaining output index
      await es.transport.request({
        path: `/${OUTPUT_DATA_INDEX}`,
        method: 'DELETE',
      });
      await deleteDataViews([sourceDataViewId, outputDataViewId]);
      await deleteConnector(connectorId);
      const alertsToDelete = await getAlertsByName(RULE_NAME);
      await deleteAlerts(alertsToDelete.map((alertItem: { id: string }) => alertItem.id));
      await security.testUser.restoreDefaults();
    });

    it('should navigate to discover via view in app link', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.selectIndexPattern(SOURCE_DATA_INDEX);
      await PageObjects.timePicker.setCommonlyUsedTime('Last_15 minutes');

      // create an alert
      await defineSearchSourceAlert(RULE_NAME);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await openAlertRule();

      await testSubjects.click('ruleDetails-viewInApp');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitFor('navigate to discover', async () => {
        const currentUrl = await browser.getCurrentUrl();
        return currentUrl.includes(sourceDataViewId);
      });

      expect(await dataGrid.getDocCount()).to.be(5);
    });

    it('should open documents triggered the alert', async () => {
      await openOutputIndex();
      await navigateToResults();

      const { message, title } = await getLastToast();
      expect(await dataGrid.getDocCount()).to.be(5);
      expect(title).to.be.equal('Displayed documents may vary');
      expect(message).to.be.equal(
        'The displayed documents might differ from the documents that triggered the alert. Some documents might have been added or deleted.'
      );
    });

    it('should display warning about updated alert rule', async () => {
      await openAlertRule();

      // change rule configuration
      await testSubjects.click('openEditRuleFlyoutButton');
      await testSubjects.click('thresholdPopover');
      await testSubjects.setValue('alertThresholdInput', '1');
      await testSubjects.click('saveEditedRuleButton');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await openOutputIndex();
      await navigateToResults();

      const { message, title } = await getLastToast();
      expect(await dataGrid.getDocCount()).to.be(5);
      expect(title).to.be.equal('Alert rule has changed');
      expect(message).to.be.equal(
        'The displayed documents might not match the documents that triggered the alert because the rule configuration changed.'
      );
    });

    it('should display not found index error', async () => {
      await openOutputIndex();
      const link = await getResultsLink();
      await navigateToDiscover(link);

      await es.transport.request({
        path: `/${SOURCE_DATA_INDEX}`,
        method: 'DELETE',
      });
      await browser.refresh();

      await navigateToDiscover(link);

      const { title } = await getLastToast();
      expect(title).to.be.equal(
        'No matching indices found: No indices match "search-source-alert"'
      );
    });
  });
}
