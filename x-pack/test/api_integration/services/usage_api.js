/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function UsageAPIProvider({ getService }) {
  const supertest = getService('supertest');
  const supertestNoAuth = getService('supertestWithoutAuth');

  async function getStats(promise) {
    return new Promise((resolve, reject) => setTimeout(async () => {
      try {
        resolve(await promise);
      } catch (err) {
        reject(err);
      }
    }, 1));
  }

  return {
    async getUsageStatsNoAuth() {
      const { body } = await getStats(supertestNoAuth
        .get('/api/stats?extended=true&wait_for_all_stats=false')
        .set('kbn-xsrf', 'xxx')
        // .retry(10)
        .expect(401)
      );
      return body.usage;
    },

    async getUsageStats() {
      const { body } = await getStats(supertest
        .get('/api/stats?extended=true&wait_for_all_stats=false')
        .set('kbn-xsrf', 'xxx')
        // .retry(10)
        .expect(200)
      );
      return body.usage;
    },
  };
}
