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
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '@kbn/cloud-security-posture-plugin/common/constants';
import type { CspBenchmarkRule } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { DETECTION_RULE_RULES_API_CURRENT_VERSION } from '@kbn/cloud-security-posture-common';
// eslint-disable @kbn/imports/no_boundary_crossing
import { generateBenchmarkRuleTags } from '@kbn/cloud-security-posture-common';
import type { FtrProviderContext } from '../ftr_provider_context';
import { CspSecurityCommonProvider } from './helper/user_roles_utilites';
import { waitForPluginInitialized } from '../utils';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const retry = getService('retry');
  const supertest = getService('supertest');
  const logger = getService('log');
  const kibanaServer = getService('kibanaServer');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const cspSecurity = CspSecurityCommonProvider(providerContext);

  const generateRuleKey = (rule: CspBenchmarkRule): string => {
    return `${rule.metadata.benchmark.id};${rule.metadata.benchmark.version};${rule.metadata.benchmark.rule_number}`;
  };

  const getRandomCspBenchmarkRule = async () => {
    const cspBenchmarkRules = await kibanaServer.savedObjects.find<CspBenchmarkRule>({
      type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
    });

    expect(cspBenchmarkRules.saved_objects.length).greaterThan(0);

    const randomIndex = Math.floor(Math.random() * cspBenchmarkRules.saved_objects.length);
    return cspBenchmarkRules.saved_objects[randomIndex].attributes;
  };

  const createDetectionRule = async (rule: CspBenchmarkRule) => {
    const detectionRule = await supertest
      .post(DETECTION_ENGINE_RULES_URL)
      .set('version', DETECTION_RULE_RULES_API_CURRENT_VERSION)
      .set('kbn-xsrf', 'xxxx')
      .send({
        type: 'query',
        language: 'kuery',
        license: 'Elastic',
        author: ['Elastic License v2'],
        filters: [],
        false_positives: [],
        risk_score: 0,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        threat: [],
        interval: '1h',
        from: 'now-26h',
        to: 'now',
        max_signals: 100,
        timestamp_override: 'event.ingested',
        timestamp_override_fallback_disabled: false,
        actions: [],
        enabled: true,
        index: ['logs-cloud_security_posture.findings-default*'],
        query: 'rule.benchmark.rule_number: foo',
        name: rule.metadata.name,
        description: rule.metadata.rationale,
        tags: generateBenchmarkRuleTags(rule.metadata),
      })
      .expect(200);
    return detectionRule;
  };

  // Failing: See https://github.com/elastic/kibana/issues/248839
  describe.skip('Verify update csp rules states API', async () => {
    before(async () => {
      await waitForPluginInitialized({ retry, logger, supertest });
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['cloud-security-posture-settings', 'alert'],
      });
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['cloud-security-posture-settings', 'alert'],
      });
    });

    it('mute benchmark rules successfully', async () => {
      const rule1 = await getRandomCspBenchmarkRule();
      const rule2 = await getRandomCspBenchmarkRule();

      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'mute',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
            {
              benchmark_id: rule2.metadata.benchmark.id,
              benchmark_version: rule2.metadata.benchmark.version,
              rule_number: rule2.metadata.benchmark.rule_number || '',
              rule_id: rule2.metadata.id,
            },
          ],
        })
        .expect(200);

      expectExpect(body.updated_benchmark_rules).toEqual(
        expectExpect.objectContaining({
          [generateRuleKey(rule1)]: {
            muted: true,
            benchmark_id: rule1.metadata.benchmark.id,
            benchmark_version: rule1.metadata.benchmark.version,
            rule_number: rule1.metadata.benchmark.rule_number
              ? rule1.metadata.benchmark.rule_number
              : '',
            rule_id: rule1.metadata.id,
          },
          [generateRuleKey(rule2)]: {
            muted: true,
            benchmark_id: rule2.metadata.benchmark.id,
            benchmark_version: rule2.metadata.benchmark.version,
            rule_number: rule2.metadata.benchmark.rule_number
              ? rule2.metadata.benchmark.rule_number
              : '',
            rule_id: rule2.metadata.id,
          },
        })
      );
      expectExpect(body.disabled_detection_rules).toEqual([]);
    });

    it('unmute rules successfully', async () => {
      const rule1 = await getRandomCspBenchmarkRule();
      const rule2 = await getRandomCspBenchmarkRule();
      // getRandomCspBenchmarkRule();
      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'unmute',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
            {
              benchmark_id: rule2.metadata.benchmark.id,
              benchmark_version: rule2.metadata.benchmark.version,
              rule_number: rule2.metadata.benchmark.rule_number || '',
              rule_id: rule2.metadata.id,
            },
          ],
        })
        .expect(200);

      expectExpect(body.updated_benchmark_rules).toEqual(
        expectExpect.objectContaining({
          [generateRuleKey(rule1)]: {
            muted: false,
            benchmark_id: rule1.metadata.benchmark.id,
            benchmark_version: rule1.metadata.benchmark.version,
            rule_number: rule1.metadata.benchmark.rule_number
              ? rule1.metadata.benchmark.rule_number
              : '',
            rule_id: rule1.metadata.id,
          },
          [generateRuleKey(rule2)]: {
            muted: false,
            benchmark_id: rule2.metadata.benchmark.id,
            benchmark_version: rule2.metadata.benchmark.version,
            rule_number: rule2.metadata.benchmark.rule_number
              ? rule2.metadata.benchmark.rule_number
              : '',
            rule_id: rule2.metadata.id,
          },
        })
      );
    });

    it('verify new rules are added and existing rules are set.', async () => {
      const rule1 = await getRandomCspBenchmarkRule();
      const rule2 = await getRandomCspBenchmarkRule();
      const rule3 = await getRandomCspBenchmarkRule();

      // unmute rule1 and rule2
      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'unmute',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
            {
              benchmark_id: rule2.metadata.benchmark.id,
              benchmark_version: rule2.metadata.benchmark.version,
              rule_number: rule2.metadata.benchmark.rule_number || '',
              rule_id: rule2.metadata.id,
            },
          ],
        })
        .expect(200);

      expectExpect(body.updated_benchmark_rules).toEqual(
        expectExpect.objectContaining({
          [generateRuleKey(rule1)]: {
            muted: false,
            benchmark_id: rule1.metadata.benchmark.id,
            benchmark_version: rule1.metadata.benchmark.version,
            rule_number: rule1.metadata.benchmark.rule_number
              ? rule1.metadata.benchmark.rule_number
              : '',
            rule_id: rule1.metadata.id,
          },
          [generateRuleKey(rule2)]: {
            muted: false,
            benchmark_id: rule2.metadata.benchmark.id,
            benchmark_version: rule2.metadata.benchmark.version,
            rule_number: rule2.metadata.benchmark.rule_number
              ? rule2.metadata.benchmark.rule_number
              : '',
            rule_id: rule2.metadata.id,
          },
        })
      );

      // mute rule1 and rule3
      const { body: body2 } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'mute',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
            {
              benchmark_id: rule3.metadata.benchmark.id,
              benchmark_version: rule3.metadata.benchmark.version,
              rule_number: rule3.metadata.benchmark.rule_number || '',
              rule_id: rule3.metadata.id,
            },
          ],
        })
        .expect(200);

      expectExpect(body2.updated_benchmark_rules).toEqual(
        expectExpect.objectContaining({
          [generateRuleKey(rule1)]: {
            muted: true,
            benchmark_id: rule1.metadata.benchmark.id,
            benchmark_version: rule1.metadata.benchmark.version,
            rule_number: rule1.metadata.benchmark.rule_number
              ? rule1.metadata.benchmark.rule_number
              : '',
            rule_id: rule1.metadata.id,
          },
          [generateRuleKey(rule3)]: {
            muted: true,
            benchmark_id: rule3.metadata.benchmark.id,
            benchmark_version: rule3.metadata.benchmark.version,
            rule_number: rule3.metadata.benchmark.rule_number
              ? rule3.metadata.benchmark.rule_number
              : '',
            rule_id: rule3.metadata.id,
          },
        })
      );
    });

    it('mute detection rule successfully', async () => {
      const rule1 = await getRandomCspBenchmarkRule();

      const detectionRule = await createDetectionRule(rule1);

      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'mute',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
          ],
        })
        .expect(200);

      expectExpect(body.disabled_detection_rules).toEqual([detectionRule.body.id]);
    });

    it('Expect to mute two benchmark rules and one detection rule', async () => {
      const rule1 = await getRandomCspBenchmarkRule();
      const rule2 = await getRandomCspBenchmarkRule();

      const detectionRule = await createDetectionRule(rule1);

      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'mute',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
            {
              benchmark_id: rule2.metadata.benchmark.id,
              benchmark_version: rule2.metadata.benchmark.version,
              rule_number: rule2.metadata.benchmark.rule_number || '',
              rule_id: rule2.metadata.id,
            },
          ],
        })
        .expect(200);

      expectExpect(body.disabled_detection_rules).toEqual([detectionRule.body.id]);
    });

    it('Expect to save rules states when requesting to update empty object', async () => {
      const rule1 = await getRandomCspBenchmarkRule();

      await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'mute',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
          ],
        })
        .expect(200);

      await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'unmute',
          rules: [],
        })
        .expect(200);

      const { body } = await supertest
        .get(`/internal/cloud_security_posture/rules/_get_states`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expectExpect(body).toEqual(
        expectExpect.objectContaining({
          [generateRuleKey(rule1)]: {
            muted: true,
            benchmark_id: rule1.metadata.benchmark.id,
            benchmark_version: rule1.metadata.benchmark.version,
            rule_number: rule1.metadata.benchmark.rule_number
              ? rule1.metadata.benchmark.rule_number
              : '',
            rule_id: rule1.metadata.id,
          },
        })
      );
    });

    it('set wrong action input', async () => {
      const rule1 = await getRandomCspBenchmarkRule();

      const { body } = await supertest
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          action: 'foo',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
          ],
        });

      expect(body.error).to.eql('Bad Request');
      expect(body.statusCode).to.eql(400);
    });

    it('users without read privileges on cloud security should not be able to mute', async () => {
      const rule1 = await getRandomCspBenchmarkRule();
      const rule2 = await getRandomCspBenchmarkRule();

      const { status } = await supertestWithoutAuth
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .auth(
          'role_security_no_read_user',
          cspSecurity.getPasswordForUser('role_security_no_read_user')
        )
        .send({
          action: 'mute',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
            {
              benchmark_id: rule2.metadata.benchmark.id,
              benchmark_version: rule2.metadata.benchmark.version,
              rule_number: rule2.metadata.benchmark.rule_number || '',
              rule_id: rule2.metadata.id,
            },
          ],
        });
      expect(status).to.be(403);
    });

    it('users with all privileges on cloud security should be able to mute', async () => {
      const rule1 = await getRandomCspBenchmarkRule();
      const rule2 = await getRandomCspBenchmarkRule();

      const { status } = await supertestWithoutAuth
        .post(`/internal/cloud_security_posture/rules/_bulk_action`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .auth('role_security_all_user', cspSecurity.getPasswordForUser('role_security_all_user'))
        .send({
          action: 'mute',
          rules: [
            {
              benchmark_id: rule1.metadata.benchmark.id,
              benchmark_version: rule1.metadata.benchmark.version,
              rule_number: rule1.metadata.benchmark.rule_number || '',
              rule_id: rule1.metadata.id,
            },
            {
              benchmark_id: rule2.metadata.benchmark.id,
              benchmark_version: rule2.metadata.benchmark.version,
              rule_number: rule2.metadata.benchmark.rule_number || '',
              rule_id: rule2.metadata.id,
            },
          ],
        });
      expect(status).to.be(200);
    });
  });
}
