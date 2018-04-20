/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('stats API', () => {
    before('load archives', async () => {
      // Using this archive because it includes reports as well as a range of visualization types.
      await esArchiver.load('reporting/6_2');
      // Not really neccessary to have data indexes, but it feels incomplete to leave out, and it is possible that
      // having data available could potentially interefere with the stats api (unlikely... but possible).
      await esArchiver.load('logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('reporting/6_2');
      await esArchiver.unload('logstash_functional');
    });

    describe('from archived data', () => {
      let stats;

      before('load stats', async () => {
        const { body } = await supertest
          .get(`/api/_kibana/v1/stats`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        stats = body;
      });

      it('counts 3 dashboards', async () => {
        expect(stats.kibana.dashboard.total).to.be(3);
      });

      it('counts 18 visualizations', async () => {
        expect(stats.kibana.visualization.total).to.be(18);
      });

      it('counts 1 saved search', async () => {
        expect(stats.kibana.search.total).to.be(1);
      });

      it('counts 1 index pattern', async () => {
        expect(stats.kibana.index_pattern.total).to.be(1);
      });

      it('counts 0 timelion_sheets', async () => {
        expect(stats.kibana.timelion_sheet.total).to.be(0);
      });

      it('counts 0 graph workspaces', async () => {
        expect(stats.kibana.graph_workspace.total).to.be(0);
      });

      it('shows reporting as available and enabled', async () => {
        expect(stats.reporting.available).to.be(true);
        expect(stats.reporting.enabled).to.be(true);
      });

      it('is using phantom browser', async () => {
        expect(stats.reporting.browser_type).to.be('phantom');
      });

      it('counts 8 total reports', async () => {
        expect(stats.reporting._all).to.be(8);
      });

      it('counts 1 csv report', async () => {
        expect(stats.reporting.csv.available).to.be(true);
        expect(stats.reporting.csv.total).to.be(1);
      });

      it('counts 7 printable_pdf reports', async () => {
        expect(stats.reporting.printable_pdf.available).to.be(true);
        expect(stats.reporting.printable_pdf.total).to.be(7);
      });
    });
  });
}
