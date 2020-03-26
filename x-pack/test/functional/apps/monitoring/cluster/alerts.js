/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

const HIGH_ALERT_MESSAGE = 'High severity alert';
const MEDIUM_ALERT_MESSAGE = 'Medium severity alert';
const LOW_ALERT_MESSAGE = 'Low severity alert';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['monitoring', 'header']);
  const overview = getService('monitoringClusterOverview');
  const alerts = getService('monitoringClusterAlerts');
  const indices = getService('monitoringElasticsearchIndices');

  describe('Cluster alerts', () => {
    describe('cluster has single alert', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-yellow-platinum', {
          from: 'Aug 29, 2017 @ 17:23:47.528',
          to: 'Aug 29, 2017 @ 17:25:50.701',
        });

        // ensure cluster alerts are shown on overview
        expect(await overview.doesClusterAlertsExist()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it('in alerts panel, a single medium alert is shown', async () => {
        const clusterAlerts = await alerts.getOverviewAlerts();
        await new Promise(r => setTimeout(r, 10000));
        expect(clusterAlerts.length).to.be(1);

        const { alertIcon, alertText } = await alerts.getOverviewAlert(0);
        expect(alertIcon).to.be(MEDIUM_ALERT_MESSAGE);
        expect(alertText).to.be(
          'Elasticsearch cluster status is yellow. Allocate missing replica shards.'
        );
      });
    });

    describe('cluster has 10 alerts', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-yellow-platinum--with-10-alerts', {
          from: 'Aug 29, 2017 @ 17:23:47.528',
          to: 'Aug 29, 2017 @ 17:25:50.701',
        });

        // ensure cluster alerts are shown on overview
        expect(await overview.doesClusterAlertsExist()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it('in alerts panel, top 3 alerts are shown', async () => {
        const clusterAlerts = await alerts.getOverviewAlerts();
        expect(clusterAlerts.length).to.be(3);

        // check the all data in the panel
        const panelData = [
          {
            alertIcon: HIGH_ALERT_MESSAGE,
            alertText:
              'One cannot step twice in the same river. Heraclitus (ca. 540 – ca. 480 BCE)',
          },
          {
            alertIcon: HIGH_ALERT_MESSAGE,
            alertText: 'Quality is not an act, it is a habit. Aristotle (384-322 BCE)',
          },
          {
            alertIcon: HIGH_ALERT_MESSAGE,
            alertText:
              'Life contains but two tragedies. One is not to get your heart’s desire; the other is to get it. Socrates (470-399 BCE)',
          },
        ];

        const alertsAll = await alerts.getOverviewAlertsAll();

        alertsAll.forEach((obj, index) => {
          expect(alertsAll[index].alertIcon).to.be(panelData[index].alertIcon);
          expect(alertsAll[index].alertText).to.be(panelData[index].alertText);
        });
      });

      it('in alerts table view, all alerts are shown', async () => {
        await alerts.clickViewAll();
        expect(await alerts.isOnListingPage()).to.be(true);

        // Check the all data in the table
        const tableData = [
          {
            alertIcon: HIGH_ALERT_MESSAGE,
            alertText:
              'One cannot step twice in the same river. Heraclitus (ca. 540 – ca. 480 BCE)',
          },
          {
            alertIcon: HIGH_ALERT_MESSAGE,
            alertText: 'Quality is not an act, it is a habit. Aristotle (384-322 BCE)',
          },
          {
            alertIcon: HIGH_ALERT_MESSAGE,
            alertText:
              'Life contains but two tragedies. One is not to get your heart’s desire; the other is to get it. Socrates (470-399 BCE)',
          },
          {
            alertIcon: HIGH_ALERT_MESSAGE,
            alertText:
              'The owl of Minerva spreads its wings only with the falling of the dusk. G.W.F. Hegel (1770 – 1831)',
          },
          {
            alertIcon: MEDIUM_ALERT_MESSAGE,
            alertText:
              'We live in the best of all possible worlds. Gottfried Wilhelm Leibniz (1646 – 1716)',
          },
          {
            alertIcon: MEDIUM_ALERT_MESSAGE,
            alertText:
              'To be is to be perceived (Esse est percipi). Bishop George Berkeley (1685 – 1753)',
          },
          {
            alertIcon: MEDIUM_ALERT_MESSAGE,
            alertText: 'I think therefore I am. René Descartes (1596 – 1650)',
          },
          {
            alertIcon: LOW_ALERT_MESSAGE,
            alertText:
              'The life of man [is] solitary, poor, nasty, brutish, and short. Thomas Hobbes (1588 – 1679)',
          },
          {
            alertIcon: LOW_ALERT_MESSAGE,
            alertText:
              'Entities should not be multiplied unnecessarily. William of Ockham (1285 - 1349?)',
          },
          {
            alertIcon: LOW_ALERT_MESSAGE,
            alertText: 'The unexamined life is not worth living. Socrates (470-399 BCE)',
          },
        ];

        // In some environments, with Elasticsearch 7, the cluster's status goes yellow, which makes
        // this test flakey, as there is occasionally an unexpected alert about this. So, we'll ignore
        // that one.
        const alertsAll = Array.from(await alerts.getTableAlertsAll()).filter(
          ({ alertText }) => !alertText.includes('status is yellow')
        );
        expect(alertsAll.length).to.be(tableData.length);

        alertsAll.forEach((obj, index) => {
          expect(`${alertsAll[index].alertIcon} ${alertsAll[index].alertText}`).to.be(
            `${tableData[index].alertIcon} ${tableData[index].alertText}`
          );
        });

        await PageObjects.monitoring.clickBreadcrumb('~breadcrumbClusters');
      });
    });

    describe('alert actions take you to the elasticsearch indices listing', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      before(async () => {
        await setup('monitoring/singlecluster-yellow-platinum', {
          from: 'Aug 29, 2017 @ 17:23:47.528',
          to: 'Aug 29, 2017 @ 17:25:50.701',
        });

        // ensure cluster alerts are shown on overview
        expect(await overview.doesClusterAlertsExist()).to.be(true);
      });

      after(async () => {
        await tearDown();
      });

      it('with alert on overview', async () => {
        const { alertAction } = await alerts.getOverviewAlert(0);
        await alertAction.click();
        expect(await indices.isOnListing()).to.be(true);

        await PageObjects.monitoring.clickBreadcrumb('~breadcrumbClusters');
      });

      it('with alert on listing table page', async () => {
        await alerts.clickViewAll();
        expect(await alerts.isOnListingPage()).to.be(true);

        const { alertAction } = await alerts.getTableAlert(0);
        await alertAction.click();
        expect(await indices.isOnListing()).to.be(true);

        await PageObjects.monitoring.clickBreadcrumb('~breadcrumbClusters');
      });
    });
  });
}
