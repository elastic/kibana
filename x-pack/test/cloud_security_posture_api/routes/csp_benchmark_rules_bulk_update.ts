/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { expect as expectExpect } from 'expect';

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

interface RuleIdentifier {
  benchmarkId: string;
  benchmarkVersion: string;
  ruleNumber: string;
}

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('supertest');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  const generateRuleKey = (ruleParams: RuleIdentifier): string => {
    return `${ruleParams.benchmarkId};${ruleParams.benchmarkVersion};${ruleParams.ruleNumber}`;
  };

  const generateRandomRule = (): RuleIdentifier => {
    const majorVersionNumber = Math.floor(Math.random() * 10); // Random major number between 0 and 9
    const minorVersionNumber = Math.floor(Math.random() * 10);
    const benchmarksIds = ['cis_aws', 'cis_k8s', 'cis_k8s'];
    const benchmarksVersions = ['v2.0.0', 'v2.0.1', 'v2.0.3', 'v3.0.0'];
    const randomBenchmarkId = benchmarksIds[Math.floor(Math.random() * benchmarksIds.length)];
    const randomBenchmarkVersion =
      benchmarksVersions[Math.floor(Math.random() * benchmarksVersions.length)];

    return {
      benchmarkId: randomBenchmarkId,
      benchmarkVersion: randomBenchmarkVersion,
      ruleNumber: `${majorVersionNumber}.${minorVersionNumber}`,
    };
  };

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

  describe('Verify update csp rules states API', async () => {
    before(async () => {
      await waitForPluginInitialized();
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['cloud-security-posture-settings'],
      });
    });

    it('mute rules successfully', async () => {
      const rule1 = generateRandomRule();
      const rule2 = generateRandomRule();

      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'mute',
          rules: [
            {
              benchmark_id: rule1.benchmarkId,
              benchmark_version: rule1.benchmarkVersion,
              rule_number: rule1.ruleNumber,
            },
            {
              benchmark_id: rule2.benchmarkId,
              benchmark_version: rule2.benchmarkVersion,
              rule_number: rule2.ruleNumber,
            },
          ],
        })
        .expect(200);

      expectExpect(body.updated_benchmark_rules).toEqual(
        expectExpect.objectContaining({
          [generateRuleKey(rule1)]: { muted: true },
          [generateRuleKey(rule2)]: { muted: true },
        })
      );
    });

    it('unmute rules successfully', async () => {
      const rule1 = generateRandomRule();
      const rule2 = generateRandomRule();

      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'unmute',
          rules: [
            {
              benchmark_id: rule1.benchmarkId,
              benchmark_version: rule1.benchmarkVersion,
              rule_number: rule1.ruleNumber,
            },
            {
              benchmark_id: rule2.benchmarkId,
              benchmark_version: rule2.benchmarkVersion,
              rule_number: rule2.ruleNumber,
            },
          ],
        })
        .expect(200);

      expectExpect(body.updated_benchmark_rules).toEqual(
        expectExpect.objectContaining({
          [generateRuleKey(rule1)]: { muted: false },
          [generateRuleKey(rule2)]: { muted: false },
        })
      );
    });

    it('verify new rules are added and existing rules are set.', async () => {
      const rule1 = generateRandomRule();
      const rule2 = generateRandomRule();
      const rule3 = generateRandomRule();

      // unmute rule1 and rule2
      const cspSettingsResponse = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'unmute',
          rules: [
            {
              benchmark_id: rule1.benchmarkId,
              benchmark_version: rule1.benchmarkVersion,
              rule_number: rule1.ruleNumber,
            },
            {
              benchmark_id: rule2.benchmarkId,
              benchmark_version: rule2.benchmarkVersion,
              rule_number: rule2.ruleNumber,
            },
          ],
        })
        .expect(200);

      expectExpect(cspSettingsResponse.body.updated_benchmark_rules).toEqual(
        expectExpect.objectContaining({
          [generateRuleKey(rule1)]: { muted: false },
          [generateRuleKey(rule2)]: { muted: false },
        })
      );

      // mute rule1 and rule3
      const updatedCspSettingsResponse = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'mute',
          rules: [
            {
              benchmark_id: rule1.benchmarkId,
              benchmark_version: rule1.benchmarkVersion,
              rule_number: rule1.ruleNumber,
            },
            {
              benchmark_id: rule3.benchmarkId,
              benchmark_version: rule3.benchmarkVersion,
              rule_number: rule3.ruleNumber,
            },
          ],
        })
        .expect(200);

      expectExpect(updatedCspSettingsResponse.body.updated_benchmark_rules).toEqual(
        expectExpect.objectContaining({
          [generateRuleKey(rule1)]: { muted: true },
          [generateRuleKey(rule3)]: { muted: true },
        })
      );
    });

    it('set wrong action input', async () => {
      const rule1 = generateRandomRule();

      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'foo',
          rules: [
            {
              benchmark_id: rule1.benchmarkId,
              benchmark_version: rule1.benchmarkVersion,
              rule_number: rule1.ruleNumber,
            },
          ],
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
        .send({
          action: 'mute',
          rule_ids: ['invalid_rule_structure'],
        });

      expect(body.error).to.eql('Bad Request');
      expect(body.statusCode).to.eql(400);
    });
  });
}
