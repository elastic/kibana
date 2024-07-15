/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { apm, ApmFields, SynthtraceGenerator, timerange } from '@kbn/apm-synthtrace-client';
import { compact, uniq } from 'lodash';
import { Readable } from 'stream';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../shared/services';
import { APMFtrContextProvider } from '../common/services';

export default function ({ getService }: APMFtrContextProvider) {
  const apmApiClient = getService('apmApiClient');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  async function fetchAndBuildCriticalPathTree(
    synthtraceEsClient: ApmSynthtraceEsClient,
    options: {
      fn: () => SynthtraceGenerator<ApmFields>;
      roleAuthc: RoleCredentials;
      internalReqHeader: InternalRequestHeader;
    } & ({ serviceName: string; transactionName: string } | {})
  ) {
    const { fn, roleAuthc, internalReqHeader } = options;

    const generator = fn();

    const unserialized = Array.from(generator);
    const serialized = unserialized.flatMap((event) => event.serialize());
    const traceIds = compact(uniq(serialized.map((event) => event['trace.id'])));

    await synthtraceEsClient.index(Readable.from(unserialized));

    return apmApiClient.slsUser({
      endpoint: 'POST /internal/apm/traces/aggregated_critical_path',
      params: {
        body: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          traceIds,
          serviceName: 'serviceName' in options ? options.serviceName : null,
          transactionName: 'transactionName' in options ? options.transactionName : null,
        },
      },
      roleAuthc,
      internalReqHeader,
    });
  }

  describe('APM Aggregated critical path', () => {
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    let synthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      synthtraceEsClient = await synthtrace.createSynthtraceEsClient();
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
      return synthtraceEsClient.clean();
    });

    it('returns service map elements', async () => {
      const java = apm
        .service({ name: 'java', environment: 'production', agentName: 'java' })
        .instance('java');

      const duration = 1000;
      const rate = 10;

      const response = await fetchAndBuildCriticalPathTree(synthtraceEsClient, {
        fn: () =>
          timerange(start, end)
            .interval('15m')
            .rate(rate)
            .generator((timestamp) => {
              return java.transaction('GET /api').timestamp(timestamp).duration(duration);
            }),
        roleAuthc,
        internalReqHeader,
      });

      expect(response.status).toBe(200);
      expect(response.body.criticalPath).not.toBeUndefined();
    });
  });
}
