/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import { log, timerange } from '@kbn/synthtrace-client';
import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials, SupertestWithRoleScopeType } from '../../services';
import { customRoles } from './custom_roles';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const synthtrace = getService('synthtrace');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const es = getService('es');
  const config = getService('config');
  const isServerless = !!config.get('serverless');
  const customRoleScopedSupertest = getService('customRoleScopedSupertest');
  const samlAuth = getService('samlAuth');

  const start = '2025-01-01T00:00:00.000Z';
  const end = '2025-01-01T00:01:00.000Z';

  const enabledDs = 'logs-synth.fs-default';
  const disabledDs = 'logs-synth.no-default';

  async function callDetails(supertestApi: any, ds: string) {
    return supertestApi
      .get(`/internal/dataset_quality/data_streams/${encodeURIComponent(ds)}/details`)
      .query({ start, end });
  }

  describe('Failure-store on data-streams', function () {
    // This disables the forward-compatibility test for Elasticsearch 8.19 with Kibana and ES 9.0.
    // These versions are not expected to work together. Note: Failure store is not available in ES 9.0,
    // and running these tests will result in an "unknown index privilege [read_failure_store]" error.
    this.onlyEsVersion('8.19 || >=9.1');

    let client: LogsSynthtraceEsClient;
    let supertestAdmin: any;

    before(async () => {
      client = await synthtrace.createLogsSynthtraceEsClient();

      await client.createComponentTemplate({
        name: 'logs-failure-enabled@mappings',
        dataStreamOptions: { failure_store: { enabled: true } },
      });
      await client.createComponentTemplate({
        name: 'logs-failure-disabled@mappings',
        dataStreamOptions: { failure_store: { enabled: false } },
      });
      await es.indices.putIndexTemplate({
        name: enabledDs,
        index_patterns: [enabledDs],
        composed_of: [
          'logs@mappings',
          'logs@settings',
          'ecs@mappings',
          'logs-failure-enabled@mappings',
        ],
        priority: 500,
        allow_auto_create: true,
        data_stream: { hidden: false },
      });

      await es.indices.putIndexTemplate({
        name: disabledDs,
        index_patterns: [disabledDs],
        composed_of: [
          'logs@mappings',
          'logs@settings',
          'ecs@mappings',
          'logs-failure-disabled@mappings',
        ],
        priority: 500,
        allow_auto_create: true,
        data_stream: { hidden: false },
      });

      await client.index([
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((ts) => log.create().timestamp(ts).dataset('synth.fs')),
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((ts) => log.create().timestamp(ts).dataset('synth.no')),
      ]);
      await client.refresh();

      supertestAdmin = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });
    });

    after(async () => {
      await es.indices.deleteIndexTemplate({ name: enabledDs });
      await es.indices.deleteIndexTemplate({ name: disabledDs });
      await client.deleteComponentTemplate('logs-failure-enabled@mappings');
      await client.deleteComponentTemplate('logs-failure-disabled@mappings');
      await client.clean();
    });
    describe('Failure-store flag on data-streams', () => {
      it('details API reports correct hasFailureStore flag', async () => {
        const enabled = await callDetails(supertestAdmin, enabledDs);
        const disabled = await callDetails(supertestAdmin, disabledDs);
        expect(enabled.body.hasFailureStore).to.be(true);
        expect(disabled.body.hasFailureStore).to.be(false);
      });
    });

    describe('Failure-store retention periods on data-streams', () => {
      let supertestDatasetQualityMonitorWithCookieCredentials: SupertestWithRoleScopeType;
      let roleAuthc: RoleCredentials;

      before(async () => {
        await samlAuth.setCustomRole(customRoles.datasetQualityMonitorUserRole);
        roleAuthc = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        supertestDatasetQualityMonitorWithCookieCredentials =
          await customRoleScopedSupertest.getSupertestWithCustomRoleScope({
            useCookieHeader: true,
            withInternalHeaders: true,
          });
      });

      after(async () => {
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('returns "customRetentionPeriod"', async () => {
        await es.indices.putDataStreamOptions({
          name: enabledDs,
          failure_store: {
            enabled: true,
            lifecycle: {
              data_retention: '30d',
              enabled: true,
            },
          },
        });

        const resp = await callDetails(
          supertestDatasetQualityMonitorWithCookieCredentials,
          enabledDs
        );

        expect(resp.status).to.be(200);
        expect(resp.body).to.have.property('customRetentionPeriod');
        expect(resp.body.customRetentionPeriod).to.be('30d');
      });

      it('returns "defaultRetentionPeriod" if present in data streams details', async () => {
        await es.indices.putDataStreamOptions({
          name: enabledDs,
          failure_store: {
            enabled: true,
          },
        });

        const resp = await callDetails(
          supertestDatasetQualityMonitorWithCookieCredentials,
          enabledDs
        );

        expect(resp.status).to.be(200);
        expect(resp.body).to.have.property('defaultRetentionPeriod');
        expect(resp.body.defaultRetentionPeriod).not.to.be(undefined);
      });

      it('returns "defaultRetentionPeriod" if not present in data streams details and user has permissions to view it at cluster level only in serverless', async () => {
        await es.indices.putDataStreamOptions({
          name: enabledDs,
          failure_store: {
            enabled: false,
          },
        });

        const resp = await callDetails(supertestAdmin, enabledDs);

        expect(resp.status).to.be(200);
        if (!isServerless) {
          expect(resp.body).to.have.property('defaultRetentionPeriod');
          expect(resp.body.defaultRetentionPeriod).not.to.be(undefined);
        } else {
          expect(resp.body).not.to.have.property('defaultRetentionPeriod');
        }
      });

      it('do not returns "defaultRetentionPeriod" if not present in data streams details and user has not permissions to view it at cluster level', async () => {
        await es.indices.putDataStreamOptions({
          name: enabledDs,
          failure_store: {
            enabled: false,
          },
        });

        const resp = await callDetails(
          supertestDatasetQualityMonitorWithCookieCredentials,
          enabledDs
        );

        expect(resp.status).to.be(200);
        expect(resp.body).not.to.have.property('defaultRetentionPeriod');
      });
    });
  });
}
