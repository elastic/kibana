/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_DURATION,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_START,
  ALERT_STATUS,
  ALERT_INSTANCE_ID,
  TAGS,
} from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  describe('Observability alerts table configuration', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const esArchiver = getService('esArchiver');
    const testSubjects = getService('testSubjects');
    const dataGrid = getService('dataGrid');
    const browser = getService('browser');
    const retry = getService('retry');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/simple_logs');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/simple_logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    it('renders correctly with a pre-existing persisted configuration', async () => {
      await observability.alerts.common.navigateWithoutFilter();
      const LOCAL_STORAGE_KEY = 'xpack.observability.alerts.alert.table';
      await browser.setLocalStorageItem(
        LOCAL_STORAGE_KEY,
        `{"columns":[{"displayAsText":"Alert Status","id":"kibana.alert.status","initialWidth":120,"schema":"string"},{"displayAsText":"Triggered","id":"kibana.alert.start","initialWidth":190,"schema":"datetime"},{"displayAsText":"Duration","id":"kibana.alert.duration.us","initialWidth":70,"schema":"numeric"},{"displayAsText":"Rule name","id":"kibana.alert.rule.name","initialWidth":150,"schema":"string"},{"displayAsText":"Group","id":"kibana.alert.instance.id","initialWidth":100,"schema":"string"},{"displayAsText":"Observed value","id":"kibana.alert.evaluation.value","initialWidth":100,"schema":"conflict"},{"displayAsText":"Threshold","id":"kibana.alert.evaluation.threshold","initialWidth":100,"schema":"numeric"},{"displayAsText":"Tags","id":"tags","initialWidth":150,"schema":"string"},{"displayAsText":"Reason","id":"kibana.alert.reason","schema":"string"}],"sort":[{"kibana.alert.start":{"order":"desc"}}],"visibleColumns":["kibana.alert.status","kibana.alert.start","kibana.alert.duration.us","kibana.alert.rule.name","kibana.alert.instance.id","kibana.alert.evaluation.value","kibana.alert.evaluation.threshold","tags","kibana.alert.reason"]}`
      );
      await observability.alerts.common.navigateWithoutFilter();
      await observability.alerts.common.ensureNoTableErrorPrompt();
      await browser.removeLocalStorageItem(LOCAL_STORAGE_KEY);
    });

    it('renders the correct columns', async () => {
      await observability.alerts.common.navigateToTimeWithData();
      await observability.alerts.common.waitForAlertTableToLoad();
      for (const colId of [
        ALERT_STATUS,
        ALERT_START,
        ALERT_DURATION,
        ALERT_RULE_NAME,
        ALERT_INSTANCE_ID,
        ALERT_EVALUATION_VALUE,
        ALERT_EVALUATION_THRESHOLD,
        TAGS,
        ALERT_REASON,
      ]) {
        expect(await testSubjects.exists(`dataGridHeaderCell-${colId}`)).to.be(true);
      }
    });

    it('renders the group selector', async () => {
      await observability.alerts.common.navigateToTimeWithData();
      await observability.alerts.common.waitForAlertTableToLoad();
      expect(await testSubjects.exists('group-selector-dropdown')).to.be(true);
    });

    it('renders the correct alert actions', async () => {
      await observability.alerts.common.navigateToTimeWithData();
      await observability.alerts.common.waitForAlertTableToLoad();
      await testSubjects.click('alertsTableRowActionMore');
      await retry.waitFor('alert actions popover visible', () =>
        testSubjects.exists('alertsTableActionsMenu')
      );
      for (const action of [
        'add-to-existing-case-action',
        'add-to-new-case-action',
        'viewRuleDetails',
        'viewAlertDetailsPage',
        'untrackAlert',
        'toggle-alert',
      ]) {
        expect(await testSubjects.exists(action, { allowHidden: true })).to.be(true);
      }
    });

    it('remembers column changes', async () => {
      await observability.alerts.common.navigateToTimeWithData();
      await observability.alerts.common.waitForAlertTableToLoad();
      await dataGrid.clickHideColumn('kibana.alert.duration.us');

      await observability.alerts.common.navigateToTimeWithData();

      const durationColumnExists = await testSubjects.exists(
        'dataGridHeaderCell-kibana.alert.duration.us'
      );
      expect(durationColumnExists).to.be(false);
    });

    it('remembers sorting changes', async () => {
      await observability.alerts.common.navigateToTimeWithData();
      await observability.alerts.common.waitForAlertTableToLoad();
      await dataGrid.clickDocSortAsc('kibana.alert.start');

      await observability.alerts.common.navigateToTimeWithData();

      const triggeredColumnHeading = await dataGrid.getHeaderElement('kibana.alert.start');
      expect(await triggeredColumnHeading.getAttribute('aria-sort')).to.be('ascending');
    });
  });
};
