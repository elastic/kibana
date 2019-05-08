/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function UsageAPIProvider({ getService }) {
  const supertest = getService('supertest');
  const supertestNoAuth = getService('supertestWithoutAuth');

  async function getStats(test) {
    try {
      return await test
        .get('/api/stats?extended=true')
        .set('kbn-xsrf', 'xxx')
        .expect(200);
    }
    catch (err) {
      if (err.message.includes('503')) {
        return await new Promise(resolve => {
          setTimeout(async () => {
            resolve(await getStats(test));
          }, 100);
        });
      }
      throw err;
    }
  }

  return {
    async getUsageStatsNoAuth() {
      const { body } = await supertestNoAuth
        .get('/api/stats?extended=true')
        .set('kbn-xsrf', 'xxx')
        .expect(401);
      return body.usage;
    },

    async getUsageStats() {
      const { body } = await getStats(supertest);
      return body.usage;
    },
  };
}
