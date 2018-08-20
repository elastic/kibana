/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function UsageAPIProvider({ getService }) {
  const supertest = getService('supertest');
  const supertestNoAuth = getService('supertestWithoutAuth');

  return {
    async getUsageStatsNoAuth() {
      const { body } = await supertestNoAuth
        .get('/api/_xpack/usage')
        .set('kbn-xsrf', 'xxx')
        .expect(401);
      return body;
    },

    async getUsageStats() {
      const { body } = await supertest
        .get('/api/_xpack/usage')
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      return body;
    },

    async getUsageStatsFromDeprecatedPre64Endpoint() {
      const { body } = await supertest
        .get('/api/_kibana/v1/stats')
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      return body;
    },
  };
}
