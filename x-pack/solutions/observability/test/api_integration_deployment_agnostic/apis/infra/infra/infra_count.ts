/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InfraSynthtraceEsClient } from '@kbn/synthtrace';
import type {
  GetInfraEntityCountRequestBodyPayloadClient,
  GetInfraEntityCountRequestParamsPayload,
  GetInfraEntityCountResponsePayload,
} from '@kbn/infra-plugin/common/http_api';
import type { SupertestWithRoleScopeType } from '../../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

import { DATES } from '../utils/constants';
import {
  buildEcsAndSemconvWideTimerange,
  generateSemconvHostsData,
  SEMCONV_HOSTS,
  SEMCONV_HOSTS_DATA_FROM,
  SEMCONV_HOSTS_DATA_TO,
} from '../utils/semconv_hosts_data';

const ecsTimeRange = {
  from: new Date(DATES['8.0.0'].logs_and_metrics.min).toISOString(),
  to: new Date(DATES['8.0.0'].logs_and_metrics.max).toISOString(),
};

const emptyQuery = {
  bool: {
    must: [],
    filter: [],
    should: [],
    must_not: [],
  },
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe('API /api/infra/{entityType}/count', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const fetchHostsCount = async ({
      params,
      body,
    }: {
      params: GetInfraEntityCountRequestParamsPayload;
      body: GetInfraEntityCountRequestBodyPayloadClient;
    }): Promise<GetInfraEntityCountResponsePayload | undefined> => {
      const { entityType } = params;
      const response = await supertestWithAdminScope
        .post(`/api/infra/${entityType}/count`)
        .send(body)
        .expect(200);
      return response.body;
    };

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
    });

    after(async () => {
      await supertestWithAdminScope.destroy();
    });

    describe('works', () => {
      describe('with host (schema=ecs)', () => {
        before(async () => {
          await esArchiver.load(
            'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
          );
        });
        after(async () => {
          await esArchiver.unload(
            'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
          );
        });

        it('received data', async () => {
          const infraHosts = await fetchHostsCount({
            params: { entityType: 'host' },
            body: {
              query: emptyQuery,
              from: ecsTimeRange.from,
              to: ecsTimeRange.to,
              schema: 'ecs',
            },
          });

          if (infraHosts) {
            const { count, entityType: assetType } = infraHosts;
            expect(count).to.equal(3);
            expect(assetType).to.be('host');
          } else {
            throw new Error('Hosts count response should not be empty');
          }
        });
      });

      describe('with host (schema=semconv)', () => {
        let synthtraceClient: InfraSynthtraceEsClient | undefined;

        before(async () => {
          synthtraceClient = synthtrace.createInfraSynthtraceEsClient();
          await synthtraceClient.clean();
          await synthtraceClient.index(
            generateSemconvHostsData({
              from: SEMCONV_HOSTS_DATA_FROM,
              to: SEMCONV_HOSTS_DATA_TO,
              hosts: SEMCONV_HOSTS,
            })
          );
        });

        after(async () => {
          await synthtraceClient?.clean();
        });

        it('counts only OTel hosts (filtered by data_stream.dataset)', async () => {
          const infraHosts = await fetchHostsCount({
            params: { entityType: 'host' },
            body: {
              query: emptyQuery,
              from: SEMCONV_HOSTS_DATA_FROM,
              to: SEMCONV_HOSTS_DATA_TO,
              schema: 'semconv',
            },
          });

          if (!infraHosts) {
            throw new Error('Hosts count response should not be empty');
          }

          expect(infraHosts.entityType).to.be('host');
          expect(infraHosts.count).to.equal(SEMCONV_HOSTS.length);
        });
      });

      // These mixed-schema suites cover the cohort split when ECS-archived
      // hosts and OTel synthtrace hosts coexist in the cluster. They do NOT
      // cover *dual-shipping* (the same `host.name` ingested through both
      // pipelines), where naive sum-of-counts would over-count distinct
      // machines during a migration — that scenario is out of scope for this
      // suite; see issue #264011 for tracking.
      describe('with mixed ECS + semconv hosts', () => {
        let synthtraceClient: InfraSynthtraceEsClient | undefined;
        let archiveLoaded = false;

        before(async () => {
          await esArchiver.load(
            'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
          );
          archiveLoaded = true;
          synthtraceClient = synthtrace.createInfraSynthtraceEsClient();
          await synthtraceClient.clean();
          await synthtraceClient.index(
            generateSemconvHostsData({
              from: SEMCONV_HOSTS_DATA_FROM,
              to: SEMCONV_HOSTS_DATA_TO,
              hosts: SEMCONV_HOSTS,
            })
          );
        });

        after(async () => {
          // Run cleanup defensively: if `before` failed mid-setup the second
          // teardown step must still execute so we don't leak fixtures into
          // sibling suites.
          try {
            await synthtraceClient?.clean();
          } finally {
            if (archiveLoaded) {
              await esArchiver.unload(
                'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
              );
            }
          }
        });

        const wideTimerange = buildEcsAndSemconvWideTimerange({
          ecsFromMs: DATES['8.0.0'].logs_and_metrics.min,
          ecsToMs: DATES['8.0.0'].logs_and_metrics.max,
        });

        it('schema=ecs returns the ECS host count only', async () => {
          const infraHosts = await fetchHostsCount({
            params: { entityType: 'host' },
            body: { query: emptyQuery, ...wideTimerange, schema: 'ecs' },
          });

          if (!infraHosts) throw new Error('Hosts count response should not be empty');
          expect(infraHosts.count).to.equal(3);
        });

        it('schema=semconv returns the OTel host count only', async () => {
          const infraHosts = await fetchHostsCount({
            params: { entityType: 'host' },
            body: { query: emptyQuery, ...wideTimerange, schema: 'semconv' },
          });

          if (!infraHosts) throw new Error('Hosts count response should not be empty');
          expect(infraHosts.count).to.equal(SEMCONV_HOSTS.length);
        });
      });
    });
  });
}
