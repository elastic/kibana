/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('/api/_xpack/usage', () => {
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


    it('should return xpack usage data', async () => {
      const { body } = await supertest
        .get(`/api/_xpack/usage`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body.cluster_uuid).to.be.a('string');
      expect(body.kibana.dashboard.total).to.be(3);
      expect(body.kibana.visualization.total).to.be(18);
      expect(body.kibana.search.total).to.be(1);
      expect(body.kibana.index_pattern.total).to.be(1);
      expect(body.kibana.timelion_sheet.total).to.be(0);
      expect(body.kibana.graph_workspace.total).to.be(0);
      expect(body.reporting.available).to.be(true);
      expect(body.reporting.enabled).to.be(true);
      expect(body.reporting.browser_type).to.be('phantom');
      expect(body.reporting._all).to.be(8);
      expect(body.reporting.csv.available).to.be(true);
      expect(body.reporting.csv.total).to.be(1);
      expect(body.reporting.printable_pdf.available).to.be(true);
      expect(body.reporting.printable_pdf.total).to.be(7);
    });
  });
}
