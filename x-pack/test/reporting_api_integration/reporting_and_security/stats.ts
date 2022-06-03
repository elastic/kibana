/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { API_STATS_URL as REPORTING_STATS_URL } from '@kbn/reporting-plugin/common/constants';
import { ReportingStatsPayload } from '@kbn/reporting-plugin/server/types';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('Health stats', function () {
    it('requires authentication', async () => {
      await supertestWithoutAuth.get(REPORTING_STATS_URL).expect(401);
    });

    describe('API response', () => {
      let stats: ReportingStatsPayload;

      before(async () => {
        const { text } = await supertest.get(REPORTING_STATS_URL).expect(200);
        stats = JSON.parse(text);
      });

      it('includes config values', () => {
        expect(stats.config.queue.pollEnabled).eql(true);
        expect(stats.config.queue.timeout).eql(120000);
        expect(stats.config.capture.maxAttempts).eql(1);
        expect(stats.config.roles.enabled).eql(false);
      });

      it('includes kibana stats', () => {
        expect(Object.keys(stats.kibana).length).eql(4);
        expect(stats.kibana.host).a('string');
        expect(stats.kibana.name).a('string');
        expect(stats.kibana.uuid).a('string');
        expect(stats.kibana.version).match(/8\.2\.0/);
      });

      it('includes reports stats', () => {
        expect(Object.keys(stats.reports.queue).length).eql(7);
        expect(stats.reports.queue.claimed).a('number');
        expect(stats.reports.queue.completed).a('number');
        expect(stats.reports.queue.failed).a('number');
        expect(stats.reports.queue.retried).a('number');
        expect(stats.reports.queue.saved).a('number');
        expect(stats.reports.queue.scheduled).a('number');
        expect(stats.reports.queue.started).a('number');
        expect(stats.reports.state.status).eql('idle');

        expect(Object.keys(stats.reports.jobTypes).length).eql(6);
        expect(stats.reports.jobTypes.PNG).a('number');
        expect(stats.reports.jobTypes.PNGV2).a('number');
        expect(stats.reports.jobTypes.csv_searchsource).a('number');
        expect(stats.reports.jobTypes.csv_searchsource_immediate).a('number');
        expect(stats.reports.jobTypes.printable_pdf).a('number');
        expect(stats.reports.jobTypes.printable_pdf_v2).a('number');
      });
    });
  });
}
