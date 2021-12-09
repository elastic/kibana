/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function MonitoringAlertsProvider({ getService }) {
  const supertest = getService('supertest');

  return new (class MonitoringAlerts {
    async deleteAlerts() {
      const apiResponse = await supertest.get('/api/alerts/_find?per_page=20');
      const alerts = apiResponse.body.data.filter(({ consumer }) => consumer === 'monitoring');

      return await Promise.all(
        alerts.map(async (alert) =>
          supertest.delete(`/api/alerts/alert/${alert.id}`).set('kbn-xsrf', 'true').expect(204)
        )
      );
    }
  })();
}
