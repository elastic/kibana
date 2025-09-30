/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import rison from '@kbn/rison';
import type { DatasetQualityApiClientKey } from '../../common/config';
import type { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const datasetQualityApiClient = getService('datasetQualityApiClient');

  async function callApiAs(
    user: DatasetQualityApiClientKey,
    types: Array<'logs' | 'metrics' | 'traces' | 'synthetics'> = ['logs']
  ) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/types_privileges',
      params: {
        query: {
          types: rison.encodeArray(types),
        },
      },
    });
  }

  registry.when('Api Key privileges check', { config: 'basic' }, () => {
    describe('types privileges', function () {
      // This disables the forward-compatibility test for Kibana 8.19 with ES upgraded to 9.0.
      // These versions are not expected to work together.
      // The tests raise "unknown index privilege [read_failure_store]" error in ES 9.0.
      this.onlyEsVersion('8.19 || >=9.1');

      const noPrivileges = {
        canRead: false,
        canMonitor: false,
        canReadFailureStore: false,
        canManageFailureStore: false,
      };

      const fullPrivileges = {
        canRead: true,
        canMonitor: true,
        canReadFailureStore: true,
        canManageFailureStore: true,
      };

      it('returns no privileges for noAccessUser with single type', async () => {
        const resp = await callApiAs('noAccessUser', ['logs']);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(noPrivileges);
      });

      it('returns no privileges for noAccessUser with multiple types', async () => {
        const resp = await callApiAs('noAccessUser', ['logs', 'metrics']);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(noPrivileges);
        expect(resp.body.datasetTypesPrivileges['metrics-*-*']).to.eql(noPrivileges);
      });

      it('returns correct privileges for adminUser with single type', async () => {
        const resp = await callApiAs('adminUser', ['logs']);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(fullPrivileges);
      });

      it('returns correct privileges for adminUser with multiple types', async () => {
        const resp = await callApiAs('adminUser', ['logs', 'metrics', 'traces']);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['metrics-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['traces-*-*']).to.eql(fullPrivileges);
      });

      it('returns correct privileges for adminUser with all types', async () => {
        const resp = await callApiAs('adminUser', ['logs', 'metrics', 'traces', 'synthetics']);

        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['metrics-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['traces-*-*']).to.eql(fullPrivileges);
        expect(resp.body.datasetTypesPrivileges['synthetics-*-*']).to.eql(fullPrivileges);
      });

      it('returns expected structure for response', async () => {
        const resp = await callApiAs('adminUser', ['logs']);

        expect(resp.body).to.have.property('datasetTypesPrivileges');
        expect(resp.body.datasetTypesPrivileges).to.be.an('object');
        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.have.property('canRead');
        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.have.property('canMonitor');
        expect(resp.body.datasetTypesPrivileges['logs-*-*']).to.have.property(
          'canReadFailureStore'
        );
      });
    });
  });
}
