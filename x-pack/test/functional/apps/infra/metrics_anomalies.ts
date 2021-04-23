/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ML_JOB_IDS } from './constants';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects(['common', 'infraHome']);
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');

  describe('Metrics UI Anomaly Flyout', function () {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });
    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('with no anomalies present', () => {
      it('renders the anomaly flyout', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.openAnomalyFlyout();
      });
      it('renders the anomaly table with no anomalies', async () => {
        await pageObjects.infraHome.goToAnomaliesTab();
        await pageObjects.infraHome.clickHostsAnomaliesDropdown();
        await pageObjects.infraHome.getNoAnomaliesMsg();
        await pageObjects.infraHome.clickK8sAnomaliesDropdown();
        await pageObjects.infraHome.getNoAnomaliesMsg();
        await pageObjects.infraHome.closeFlyout();
      });
    });

    describe('with anomalies present', () => {
      before(async () => {
        await esArchiver.load('infra/metrics_anomalies');
        // create the ml jobs saved objects
        await Promise.all(
          ML_JOB_IDS.map((id) =>
            kibanaServer.savedObjects.create({
              type: 'ml-job',
              id: `anomaly-detector-${id}`,
              overwrite: true,
              attributes: {
                job_id: id,
                datafeed_id: `datafeed-${id}`,
                type: 'anomaly-detector',
              },
            })
          )
        );
      });
      after(async () => {
        await esArchiver.unload('infra/metrics_anomalies');
      });
      it('renders the anomaly table with anomalies', async () => {
        await pageObjects.infraHome.openAnomalyFlyout();
        await pageObjects.infraHome.goToAnomaliesTab();
        await pageObjects.infraHome.clickHostsAnomaliesDropdown();
        await pageObjects.infraHome.setAnomaliesDate('Apr 21, 2021 @ 00:00:00.000');
        const hostAnomalies = await pageObjects.infraHome.findAnomalies();
        // expect 2 anomalies with default Anomaly Severity Threshold setting (50)
        expect(hostAnomalies.length).to.be(2);
        await pageObjects.infraHome.clickK8sAnomaliesDropdown();
        const k8sAnomalies = await pageObjects.infraHome.findAnomalies();
        // expect 3 anomalies with default Anomaly Severity Threshold setting (50)
        expect(k8sAnomalies.length).to.be(1);
        await pageObjects.infraHome.closeFlyout();
      });
      it('renders the anomaly table after a date change with no anomalies', async () => {
        await pageObjects.infraHome.openAnomalyFlyout();
        await pageObjects.infraHome.goToAnomaliesTab();
        await pageObjects.infraHome.clickHostsAnomaliesDropdown();
        await pageObjects.infraHome.setAnomaliesDate('Apr 23, 2021 @ 11:00:00.000');
        await pageObjects.infraHome.getNoAnomaliesMsg();
        await pageObjects.infraHome.clickK8sAnomaliesDropdown();
        await pageObjects.infraHome.getNoAnomaliesMsg();
        await pageObjects.infraHome.closeFlyout();
      });
      it('renders more anomalies on threshold change', async () => {
        await pageObjects.infraHome.goToSettings();
        await pageObjects.infraHome.setAnomaliesThreshold('25');
        await infraSourceConfigurationForm.saveConfiguration();
        await pageObjects.infraHome.goToInventory();
        await pageObjects.infraHome.openAnomalyFlyout();
        await pageObjects.infraHome.goToAnomaliesTab();
        await pageObjects.infraHome.clickHostsAnomaliesDropdown();
        const hostAnomalies = await pageObjects.infraHome.findAnomalies();
        expect(hostAnomalies.length).to.be(4);
        await pageObjects.infraHome.clickK8sAnomaliesDropdown();
        const k8sAnomalies = await pageObjects.infraHome.findAnomalies();
        expect(k8sAnomalies.length).to.be(3);
      });
    });
  });
};
