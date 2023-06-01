/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  /*
   * This is a placeholder test to demonstrate usage.
   * This test case is actually already covered in the `serverless` plugin tests
   * and should be replaced with something specific to the security project
   * once it modifies / adds / disables Kibana APIs.
   */
  describe('Service groups fallback to default space id', function () {
    const apmApiClient = getService('apmApiClient');

    const supertest = getService('supertest');

    it('rejects request to create user', async () => {
      const r = await apmApiClient.writeUser({
        endpoint: 'GET /internal/apm/service-group/counts',
      });
      console.log(r.body);
    });
  });
}
