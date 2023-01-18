/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');

  const getBrowserZipInput = (zipUrl?: string) => ({
    type: 'synthetics/browser',
    policy_template: 'synthetics',
    enabled: false,
    streams: [
      {
        enabled: true,
        data_stream: { type: 'synthetics', dataset: 'browser' },
        vars: {
          __ui: { type: 'yaml' },
          enabled: { value: true, type: 'bool' },
          type: { value: 'browser', type: 'text' },
          name: { type: 'text' },
          schedule: { value: '"@every 3m"', type: 'text' },
          'service.name': { type: 'text' },
          timeout: { type: 'text' },
          tags: { type: 'yaml' },
          'source.zip_url.url': { type: 'text', value: zipUrl },
          'source.zip_url.username': { type: 'text' },
          'source.zip_url.folder': { type: 'text' },
          'source.zip_url.password': { type: 'password' },
          'source.inline.script': { type: 'yaml' },
          'source.project.content': { type: 'text' },
          params: { type: 'yaml' },
          playwright_options: { type: 'yaml' },
          screenshots: { type: 'text' },
          synthetics_args: { type: 'text' },
          ignore_https_errors: { type: 'bool' },
          'throttling.config': { type: 'text' },
          'filter_journeys.tags': { type: 'yaml' },
          'filter_journeys.match': { type: 'text' },
          'source.zip_url.ssl.certificate_authorities': { type: 'yaml' },
          'source.zip_url.ssl.certificate': { type: 'yaml' },
          'source.zip_url.ssl.key': { type: 'yaml' },
          'source.zip_url.ssl.key_passphrase': { type: 'text' },
          'source.zip_url.ssl.verification_mode': { type: 'text' },
          'source.zip_url.ssl.supported_protocols': { type: 'yaml' },
          'source.zip_url.proxy_url': { type: 'text' },
          location_name: { value: 'Fleet managed', type: 'text' },
          id: { type: 'text' },
          config_id: { type: 'text' },
          run_once: { value: false, type: 'bool' },
          origin: { type: 'text' },
          'monitor.project.id': { type: 'text' },
          'monitor.project.name': { type: 'text' },
        },
        id: 'synthetics/browser-browser-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
      },
    ],
  });

  describe('UptimeZipUrlDeprecation', () => {
    let agentPolicyId: string;

    before(async function () {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Test policy ${uuid()}`,
          namespace: 'default',
        })
        .expect(200);
      agentPolicyId = agentPolicyResponse.item.id;

      // create a policy without a zip url
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `synthetics-test ${uuid()}`,
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [getBrowserZipInput()],
          package: {
            name: 'synthetics',
            title: 'For Synthetics Tests',
            version: '0.10.2',
          },
        })
        .expect(200);
    });

    after(async function () {
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
    });

    it('should return hasZipUrlMonitors false when there are not any zip url policies', async function () {
      const { body } = await supertest
        .get(`/internal/uptime/fleet/has_zip_url_monitors`)
        .set('kbn-xsrf', 'xxxx')
        .send()
        .expect(200);

      expect(body.hasZipUrlMonitors).to.eql(false);
    });

    it('should return hasZipUrlMonitors true when there are zip url policies', async function () {
      const { body } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `synthetics-test ${uuid()}`,
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [getBrowserZipInput('testZipUrl')],
          package: {
            name: 'synthetics',
            title: 'For Synthetics Tests',
            version: '0.10.2',
          },
        })
        .expect(200);

      const policyId = body.item.id;

      expect(body.item.inputs[0].streams[0].vars['source.zip_url.url'].value).to.eql('testZipUrl');

      const { body: response } = await supertest
        .get(`/internal/uptime/fleet/has_zip_url_monitors`)
        .set('kbn-xsrf', 'xxxx')
        .send()
        .expect(200);

      expect(response.hasZipUrlMonitors).to.eql(true);

      // delete policy we just made
      await supertest
        .post(`/api/fleet/package_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true, packagePolicyIds: [policyId] })
        .expect(200);
    });
  });
}
