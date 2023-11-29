/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { expect as expectExpect } from 'expect';

import Chance from 'chance';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('supertest');
  const log = getService('log');
  const chance = new Chance();

  /**
   * required before indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const generateRandomRuleId = (): string => {
    const majorVersionNumber = Math.floor(Math.random() * 10); // Random major number between 0 and 9
    const minorVersionNumber = Math.floor(Math.random() * 10);
    const benchmarksIds = ['cis_aws', 'cis_k8s', 'cis_k8s'];
    const benchmarksVersions = ['v2.0.0', 'v2.0.1', 'v2.0.3', 'v3.0.0'];
    const randomBenchmarkId = benchmarksIds[Math.floor(Math.random() * benchmarksIds.length)];
    const randomBenchmarkVersion =
      benchmarksVersions[Math.floor(Math.random() * benchmarksVersions.length)];

    return `${randomBenchmarkId};${randomBenchmarkVersion};${majorVersionNumber}.${minorVersionNumber}`;
  };

  describe('Verify update csp rules states API', async () => {
    before(async () => {
      await waitForPluginInitialized();
    });

    afterEach(async () => {});

    it('mute rules successfully', async () => {
      const rule1 = generateRandomRuleId();
      const rule2 = generateRandomRuleId();

      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .query({
          action: 'mute',
          rule_ids: [rule1, rule2],
        })
        .expect(200);

      expect(body.new_csp_settings.type).to.eql('cloud-security-posture-settings');
      expect(body.new_csp_settings.id).to.eql('csp-internal-settings');

      expectExpect(body.new_csp_settings.attributes.rules_states).toEqual(
        expectExpect.objectContaining({
          [rule1]: { muted: true },
          [rule2]: { muted: true },
        })
      );
    });

    it('unmute rules successfully', async () => {
      const rule1 = generateRandomRuleId();
      const rule2 = generateRandomRuleId();

      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .query({
          action: 'unmute',
          rule_ids: [rule1, rule2],
        })
        .expect(200);

      expect(body.new_csp_settings.type).to.eql('cloud-security-posture-settings');
      expect(body.new_csp_settings.id).to.eql('csp-internal-settings');
      expectExpect(body.new_csp_settings.attributes.rules_states).toEqual(
        expectExpect.objectContaining({
          [rule1]: { muted: false },
          [rule2]: { muted: false },
        })
      );
    });

    it('verify new rules are added and existing rules are set.', async () => {
      const rule1 = generateRandomRuleId();
      const rule2 = generateRandomRuleId();
      const rule3 = generateRandomRuleId();

      // unmute rule1 and rule2
      const cspSettingsResponse = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .query({
          action: 'unmute',
          rule_ids: [rule1, rule2],
        })
        .expect(200);

      expectExpect(cspSettingsResponse.body.new_csp_settings.attributes.rules_states).toEqual(
        expectExpect.objectContaining({
          [rule1]: { muted: false },
          [rule2]: { muted: false },
        })
      );

      // mute rule1 and rule3
      const updatedCspSettingsResponse = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .query({
          action: 'mute',
          rule_ids: [rule1, rule3],
        })
        .expect(200);

      expectExpect(
        updatedCspSettingsResponse.body.new_csp_settings.attributes.rules_states
      ).toEqual(
        expectExpect.objectContaining({
          [rule1]: { muted: true },
          [rule2]: { muted: false },
          [rule3]: { muted: true },
        })
      );
    });

    it('set wrong action input', async () => {
      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .query({
          action: 'foo',
          rule_ids: [generateRandomRuleId()],
        });

      expect(body.error).to.eql('Bad Request');
      expect(body.statusCode).to.eql(400);
    });

    it('set wrong rule ids input', async () => {
      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .query({
          action: 'mute',
          rule_ids: ['invalid_rule_structure'],
        });

      expect(body.error).to.eql('Bad Request');
      expect(body.statusCode).to.eql(400);
    });
  });
}
