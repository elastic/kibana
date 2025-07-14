/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { HOSTS_VIEW_PATH, ML_JOB_IDS } from './constants';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects(['assetDetails', 'common', 'infraHome', 'infraHostsView']);
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('Metrics UI Anomaly Flyout', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('when opening the flyout', () => {
      describe('in inventory page', () => {
        it('renders the anomaly flyout in inventory page', async () => {
          await pageObjects.common.navigateToApp('infraOps');
          await pageObjects.infraHome.openAnomalyFlyout();
        });
        it('shows both cards in create jobs tab Hosts and K8s', async () => {
          await testSubjects.exists('infraHostsJobCard');
          await testSubjects.exists('infraK8sJobCard');
        });
      });

      describe('in hosts view', () => {
        it('renders the anomaly flyout in hosts view page', async () => {
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.infraHome.openAnomalyFlyout();
        });

        it('shows just Hosts create jobs card', async () => {
          await testSubjects.exists('infraHostsJobCard');
          await testSubjects.missingOrFail('infraK8sJobCard');
        });
      });
    });

    describe('anomalies table in flyout', () => {
      describe('with no anomalies present', () => {
        it('renders the anomaly table with no anomalies', async () => {
          await pageObjects.common.navigateToApp('infraOps');
          await pageObjects.infraHome.openAnomalyFlyout();
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
          await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_anomalies');
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
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_anomalies');
        });
        it('renders the anomaly table with anomalies', async () => {
          // if the input value is unchanged the save button won't be available
          // after the change of the settings action added in
          // https://github.com/elastic/kibana/pull/175024
          // to avoid the mentioned issue we can change the value and put it back to 50
          await pageObjects.infraHome.goToSettings();
          await pageObjects.infraHome.setAnomaliesThreshold('51');
          await infraSourceConfigurationForm.saveInfraSettings();
          // default threshold should already be 50 but trying to prevent unknown flakiness by setting it
          // https://github.com/elastic/kibana/issues/100445
          await pageObjects.infraHome.goToSettings();
          await pageObjects.infraHome.setAnomaliesThreshold('50');
          await infraSourceConfigurationForm.saveInfraSettings();
          await pageObjects.infraHome.goToInventory();
          await pageObjects.infraHome.openAnomalyFlyout();
          await pageObjects.infraHome.goToAnomaliesTab();
          await pageObjects.infraHome.clickHostsAnomaliesDropdown();
          await pageObjects.infraHome.setAnomaliesDate('Apr 21, 2021 @ 00:00:00.000');
          const hostAnomalies = await pageObjects.infraHome.findAnomalies();
          expect(hostAnomalies.length).to.be(2);
          await pageObjects.infraHome.clickK8sAnomaliesDropdown();
          const k8sAnomalies = await pageObjects.infraHome.findAnomalies();
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
          await infraSourceConfigurationForm.saveInfraSettings();
          await pageObjects.infraHome.goToInventory();
          await pageObjects.infraHome.openAnomalyFlyout();
          await pageObjects.infraHome.goToAnomaliesTab();
          await pageObjects.infraHome.clickHostsAnomaliesDropdown();
          await pageObjects.infraHome.setAnomaliesDate('Apr 21, 2021 @ 00:00:00.000');
          const hostAnomalies = await pageObjects.infraHome.findAnomalies();
          expect(hostAnomalies.length).to.be(4);
          await pageObjects.infraHome.clickK8sAnomaliesDropdown();
          const k8sAnomalies = await pageObjects.infraHome.findAnomalies();
          expect(k8sAnomalies.length).to.be(3);
        });
        it("should take users to hosts list when 'Show affected Hosts' is clicked", async () => {
          await pageObjects.infraHome.goToInventory();
          await pageObjects.infraHome.openAnomalyFlyout();
          await pageObjects.infraHome.goToAnomaliesTab();
          await pageObjects.infraHome.clickHostsAnomaliesDropdown();
          await pageObjects.infraHome.setAnomaliesDate('Apr 21, 2021 @ 00:00:00.000');
          const hostName = await pageObjects.infraHome.getAnomalyHostName();
          await pageObjects.infraHome.clickShowAffectedHostsButton();
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain(
            encodeURIComponent(`query:(terms:(host.name:!(${hostName})))`)
          );
        });
      });
    });
  });
};
