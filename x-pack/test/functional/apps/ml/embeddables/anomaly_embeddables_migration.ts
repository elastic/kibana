/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { JOB_CONFIG, DATAFEED_CONFIG, ML_EMBEDDABLE_TYPES } from './constants';

const testDataList = [
  {
    type: ML_EMBEDDABLE_TYPES.ANOMALY_SWIMLANE,
    panelTitle: 'ML anomaly swim lane',
    dashboardSavedObject: {
      type: 'dashboard',
      attributes: {
        title: `7.15.2 ML anomaly swimlane dashboard ${Date.now()}`,
        description: '',
        panelsJSON: `[{"version":"7.15.2","type":"ml_anomaly_swimlane","gridData":{"x":0,"y":0,"w":24,"h":15,"i":"c177ed0a-dea0-40f8-8980-cfb0c6bc13a8"},"panelIndex":"c177ed0a-dea0-40f8-8980-cfb0c6bc13a8","embeddableConfig":{"jobIds":["fq_multi_1_ae"],"swimlaneType":"viewBy","viewBy":"airline","enhancements":{}},"title":"ML anomaly swim lane"}]`,
        optionsJSON: '{"useMargins":true,"syncColors":false,"hidePanelTitles":false}',
        timeRestore: true,
        timeTo: '2016-02-11T00:00:00.000Z',
        timeFrom: '2016-02-07T00:00:00.000Z',
        refreshInterval: {
          pause: true,
          value: 0,
        },
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
        },
      },
      coreMigrationVersion: '7.15.2',
    },
  },
  {
    type: ML_EMBEDDABLE_TYPES.ANOMALY_CHARTS,
    panelTitle: 'ML anomaly charts',
    dashboardSavedObject: {
      type: 'dashboard',
      attributes: {
        title: `7.15.2 ML anomaly charts dashboard ${Date.now()}`,
        description: '',
        panelsJSON:
          '[{"version":"7.15.2","type":"ml_anomaly_charts","gridData":{"x":0,"y":0,"w":38,"h":21,"i":"1155890b-c19c-4d98-8153-50e6434612f1"},"panelIndex":"1155890b-c19c-4d98-8153-50e6434612f1","embeddableConfig":{"jobIds":["fq_multi_1_ae"],"maxSeriesToPlot":6,"severityThreshold":0,"enhancements":{}},"title":"ML anomaly charts"}]',
        optionsJSON: '{"useMargins":true,"syncColors":false,"hidePanelTitles":false}',
        timeRestore: true,
        timeTo: '2016-02-11T00:00:00.000Z',
        timeFrom: '2016-02-07T00:00:00.000Z',
        refreshInterval: {
          pause: true,
          value: 0,
        },
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
        },
      },
      coreMigrationVersion: '7.15.2',
    },
  },
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const PageObjects = getPageObjects(['common', 'timePicker', 'dashboard']);

  describe('anomaly embeddables migration in Dashboard', function () {
    this.tags(['mlqa']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
      // Using bulk API because create API might return 400 for conflict errors
      await ml.testResources.createBulkSavedObjects(
        testDataList.map((d) => d.dashboardSavedObject)
      );

      await PageObjects.common.navigateToApp('dashboard');
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    for (const testData of testDataList) {
      const { dashboardSavedObject, panelTitle, type } = testData;
      describe(`for ${panelTitle}`, function () {
        before(async () => {
          await PageObjects.common.navigateToApp('dashboard');
        });

        after(async () => {
          await ml.testResources.deleteDashboardByTitle(dashboardSavedObject.attributes.title);
        });

        it(`loads saved dashboard from version ${dashboardSavedObject.coreMigrationVersion}`, async () => {
          await PageObjects.dashboard.loadSavedDashboard(dashboardSavedObject.attributes.title);

          await ml.dashboardEmbeddables.assertDashboardPanelExists(panelTitle);

          if (type === ML_EMBEDDABLE_TYPES.ANOMALY_CHARTS) {
            await ml.dashboardEmbeddables.assertAnomalyChartsSeverityThresholdControlExists();
            await ml.dashboardEmbeddables.assertAnomalyChartsExists();
          }

          if (type === ML_EMBEDDABLE_TYPES.ANOMALY_SWIMLANE) {
            await ml.dashboardEmbeddables.assertAnomalySwimlaneExists();
          }
        });
      });
    }
  });
}
