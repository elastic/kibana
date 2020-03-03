/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ getService }) {
  const supertest = getService('supertest');

  describe('telemetry collectors', () => {
    it('should receive a 200 for overview page logging', async () => {
      await supertest.get('/api/uptime/logOverview').expect(200);
    });

    it('should receive a 200 for monitor page logging', async () => {
      await supertest.get('/api/uptime/logMonitor').expect(200);
    });
  });
}
