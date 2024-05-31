/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('Custom threshold rule', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const dataView1 = 'filebeat-*';
    const dataView2 = 'metricbeat-*';
    const timeFieldName = '@timestamp';

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      // create two data views
      await supertest
        .post(`/api/saved_objects/index-pattern`)
        .set('kbn-xsrf', 'true')
        .send({ attributes: { title: dataView1, timeFieldName } });
      await supertest
        .post(`/api/saved_objects/index-pattern`)
        .set('kbn-xsrf', 'true')
        .send({ attributes: { title: dataView2, timeFieldName } });
      await observability.alerts.common.navigateToRulesPage();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('is filtered to only show "all" alerts by default', async () => {
      await observability.alerts.rulesPage.clickCreateRuleButton();
      await observability.alerts.rulesPage.clickOnObservabilityCategory();
      await testSubjects.existOrFail('observability.rules.custom_threshold-SelectOption');
    });

    it('can create a custom threshold rule', async () => {
      await observability.alerts.rulesPage.clickOnCustomThresholdRule();
      await observability.alerts.rulesPage.fillCustomThresholdRule('test custom threshold rule');
    });

    it('saved the rule correctly', async () => {
      const { body: rules } = await supertest
        .post('/internal/alerting/rules/_find')
        .set('kbn-xsrf', 'true')
        .send({
          page: 1,
          per_page: 10,
          filter:
            '{"type":"function","function":"or","arguments":[{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":".es-query","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"xpack.ml.anomaly_detection_alert","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"xpack.uptime.alerts.tlsCertificate","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"xpack.uptime.alerts.monitorStatus","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"xpack.uptime.alerts.durationAnomaly","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"xpack.synthetics.alerts.monitorStatus","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"xpack.synthetics.alerts.tls","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"slo.rules.burnRate","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"metrics.alert.threshold","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"metrics.alert.inventory.threshold","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"observability.rules.custom_threshold","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"logs.alert.document.count","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"apm.error_rate","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"apm.transaction_error_rate","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"apm.transaction_duration","isQuoted":false}]},{"type":"function","function":"is","arguments":[{"type":"literal","value":"alert.attributes.alertTypeId","isQuoted":false},{"type":"literal","value":"apm.anomaly","isQuoted":false}]}]}',
          sort_field: 'name',
          sort_order: 'asc',
          filter_consumers: ['apm', 'infrastructure', 'logs', 'uptime', 'slo', 'observability'],
        });
      expect(rules.data.length).toEqual(1);
      expect(rules.data[0]).toEqual(
        expect.objectContaining({
          name: 'test custom threshold rule',
          tags: ['tag1'],
          params: expect.objectContaining({
            alertOnGroupDisappear: true,
            alertOnNoData: true,
            criteria: [
              {
                comparator: '>',
                label: 'test equation',
                metrics: [
                  {
                    aggType: 'avg',
                    field: 'metricset.rtt',
                    name: 'A',
                  },
                  {
                    aggType: 'count',
                    filter: 'service.name : "opbeans-node"',
                    name: 'B',
                  },
                ],
                threshold: [200, 250],
                timeSize: 2,
                timeUnit: 'd',
              },
            ],
            groupBy: ['docker.container.name'],
            // searchConfiguration: {
            //   index: 'ef4deffb-805f-4aed-ad80-f481ee47d40b',
            //   query: {
            //     language: 'kuery',
            //     query: '',
            //   },
            // },
          }),
        })
      );
    });
  });
};
