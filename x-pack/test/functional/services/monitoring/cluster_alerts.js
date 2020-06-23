/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { range } from 'lodash';
import { map as mapAsync } from 'bluebird';

export function MonitoringClusterAlertsProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['monitoring']);

  const SUBJ_OVERVIEW_CLUSTER_ALERTS = `clusterAlertsContainer`;
  const SUBJ_OVERVIEW_ICONS =
    `[data-test-subj="${SUBJ_OVERVIEW_CLUSTER_ALERTS}"] ` +
    `[data-test-subj="topAlertItem"] .euiCallOutHeader__title`;
  const SUBJ_OVERVIEW_TEXTS = `${SUBJ_OVERVIEW_CLUSTER_ALERTS} > alertText`;
  const SUBJ_OVERVIEW_ACTIONS = `${SUBJ_OVERVIEW_CLUSTER_ALERTS} > alertAction`;
  const SUBJ_OVERVIEW_VIEW_ALL = `${SUBJ_OVERVIEW_CLUSTER_ALERTS} > viewAllAlerts`;

  const SUBJ_TABLE_BODY = 'alertsTableContainer';
  const SUBJ_TABLE_ICONS = `${SUBJ_TABLE_BODY} > alertIcon`;
  const SUBJ_TABLE_TEXTS = `${SUBJ_TABLE_BODY} > alertText`;
  const SUBJ_TABLE_ACTIONS = `${SUBJ_TABLE_BODY} > alertAction`;

  return new (class ClusterAlerts {
    /*
     * Helper function to return the testable panel listing content or table content
     */
    async _getAlertSetAll({ alertIcons, textsSubj, actionsSubj, size }) {
      const alertTexts = await testSubjects.getVisibleTextAll(textsSubj);
      const alertActions = await testSubjects.findAll(actionsSubj);

      // tuple-ize the icons and texts together into an array of objects
      const iterator = range(size);
      return iterator.reduce((all, current) => {
        return [
          ...all,
          {
            alertIcon: alertIcons[current],
            alertText: alertTexts[current],
            alertAction: alertActions[current],
          },
        ];
      }, []);
    }

    /*
     * Cluster Overview Page
     */

    getOverviewAlerts() {
      return testSubjects.findAll(`${SUBJ_OVERVIEW_CLUSTER_ALERTS} > topAlertItem`);
    }

    async getOverviewAlertsAll() {
      const listingRows = await this.getOverviewAlerts();
      const alertIcons = await retry.try(async () => {
        const elements = await find.allByCssSelector(SUBJ_OVERVIEW_ICONS);
        return await mapAsync(elements, async (element) => {
          return await element.getVisibleText();
        });
      });

      return await this._getAlertSetAll({
        size: listingRows.length,
        alertIcons,
        textsSubj: SUBJ_OVERVIEW_TEXTS,
        actionsSubj: SUBJ_OVERVIEW_ACTIONS,
      });
    }

    async getOverviewAlert(index) {
      const alerts = await this.getOverviewAlertsAll();
      return alerts[index];
    }

    clickViewAll() {
      return testSubjects.click(SUBJ_OVERVIEW_VIEW_ALL);
    }

    /*
     * Cluster Alerts Table
     */

    async isOnListingPage() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_TABLE_BODY));
      return pageId !== null;
    }

    getTableAlerts() {
      return PageObjects.monitoring.tableGetRowsFromContainer(SUBJ_TABLE_BODY);
    }

    async getTableAlertsAll() {
      const tableRows = await this.getTableAlerts();
      const alertIcons = await testSubjects.getAttributeAll(SUBJ_TABLE_ICONS, 'aria-label');

      return await this._getAlertSetAll({
        size: tableRows.length,
        alertIcons,
        textsSubj: SUBJ_TABLE_TEXTS,
        actionsSubj: SUBJ_TABLE_ACTIONS,
      });
    }

    async getTableAlert(index) {
      const alerts = await this.getTableAlertsAll();
      return alerts[index];
    }
  })();
}
