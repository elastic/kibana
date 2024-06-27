/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import expect from 'expect';
import { serviceMap, timerange } from '@kbn/apm-synthtrace-client';
import { Readable } from 'stream';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../shared/services';
import { APMFtrContextProvider } from '../common/services';

export default function ({ getService }: APMFtrContextProvider) {
  const apmApiClient = getService('apmApiClient');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2024-06-01T00:00:00.000Z').getTime();
  const end = new Date('2024-06-01T00:01:00.000Z').getTime();

  describe('APM Service maps', () => {
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    let synthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      synthtraceEsClient = await synthtrace.createSynthtraceEsClient();

      const events = timerange(start, end)
        .interval('10s')
        .rate(3)
        .generator(
          serviceMap({
            services: [
              { 'frontend-rum': 'rum-js' },
              { 'frontend-node': 'nodejs' },
              { advertService: 'java' },
            ],
            definePaths([rum, node, adv]) {
              return [
                [
                  [rum, 'fetchAd'],
                  [node, 'GET /nodejs/adTag'],
                  [adv, 'APIRestController#getAd'],
                  ['elasticsearch', 'GET ad-*/_search'],
                ],
              ];
            },
          })
        );

      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');

      return synthtraceEsClient.index(Readable.from(Array.from(events)));
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
      return synthtraceEsClient.clean();
    });

    it('returns service map elements', async () => {
      const response = await apmApiClient.slsUser({
        endpoint: 'GET /internal/apm/service-map',
        params: {
          query: {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            environment: 'ENVIRONMENT_ALL',
          },
        },
        roleAuthc,
        internalReqHeader,
      });

      expect(response.status).toBe(200);
      expect(response.body.elements.length).toBeGreaterThan(0);
    });
  });
}
