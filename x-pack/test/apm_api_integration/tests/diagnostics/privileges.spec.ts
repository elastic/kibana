/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  registry.when('Diagnostics: Privileges', { config: 'basic', archives: [] }, () => {
    describe('superuser', () => {
      let body: APIReturnType<'GET /internal/apm/diagnostics'>;

      beforeEach(async () => {
        const res = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        body = res.body;
        expect(res.status).to.be(200);
      });

      it('has all privileges', async () => {
        expect(body.diagnosticsPrivileges.hasAllPrivileges).to.be(true);
      });

      it('has all index privileges', async () => {
        expect(body.diagnosticsPrivileges.hasAllIndexPrivileges).to.be(true);
        expect(body.diagnosticsPrivileges.index).to.eql({
          'apm-*': { read: true },
          'logs-apm*': { read: true },
          'metrics-apm*': { read: true },
          'traces-apm*': { read: true },
          'logs-*.otel-*': { read: true },
          'metrics-*.otel-*': { read: true },
          'traces-*.otel-*': { read: true },
        });
      });

      it('has all cluster privileges', async () => {
        expect(body.diagnosticsPrivileges.hasAllClusterPrivileges).to.be(true);
        expect(body.diagnosticsPrivileges.cluster).to.eql({
          read_pipeline: true,
          manage_index_templates: true,
          monitor: true,
        });
      });
    });

    describe('viewer', () => {
      let body: APIReturnType<'GET /internal/apm/diagnostics'>;

      beforeEach(async () => {
        const res = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        body = res.body;
        expect(res.status).to.be(200);
      });

      it('does not have all privileges', async () => {
        expect(body.diagnosticsPrivileges.hasAllPrivileges).to.be(false);
      });

      it('has all index privileges', async () => {
        expect(body.diagnosticsPrivileges.hasAllIndexPrivileges).to.be(true);
        expect(body.diagnosticsPrivileges.index).to.eql({
          'apm-*': { read: true },
          'logs-apm*': { read: true },
          'metrics-apm*': { read: true },
          'traces-apm*': { read: true },
          'logs-*.otel-*': { read: true },
          'metrics-*.otel-*': { read: true },
          'traces-*.otel-*': { read: true },
        });
      });

      it('does not have any cluster privileges', async () => {
        expect(body.diagnosticsPrivileges.hasAllClusterPrivileges).to.be(false);
        expect(body.diagnosticsPrivileges.cluster).to.eql({
          read_pipeline: false,
          manage_index_templates: false,
          monitor: false,
        });
      });
    });
  });
}
