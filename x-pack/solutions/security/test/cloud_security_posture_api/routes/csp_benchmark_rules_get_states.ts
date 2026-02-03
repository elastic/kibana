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
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '@kbn/cloud-security-posture-plugin/common/constants';
import type { CspBenchmarkRule } from '@kbn/cloud-security-posture-common/schema/rules/latest';
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

  // Failing: See https://github.com/elastic/kibana/issues/249190
  describe.skip('Tests get rules states API', async () => {
    before(async () => {
      await waitForPluginInitialized({ retry, logger, supertest });
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['cloud-security-posture-settings'],
      });
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['cloud-security-posture-settings'],
      });
    });

    it('get rules states successfully', async () => {
      const rule1 = await getRandomCspBenchmarkRule();
      const rule2 = await getRandomCspBenchmarkRule();
      const rule3 = await getRandomCspBenchmarkRule();

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
            {
              benchmark_id: rule2.metadata.benchmark.id,
              benchmark_version: rule2.metadata.benchmark.version,
              rule_number: rule2.metadata.benchmark.rule_number || '',
              rule_id: rule2.metadata.id,
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
          rules: [
            {
              benchmark_id: rule3.metadata.benchmark.id,
              benchmark_version: rule3.metadata.benchmark.version,
              rule_number: rule3.metadata.benchmark.rule_number || '',
              rule_id: rule3.metadata.id,
            },
          ],
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
          [generateRuleKey(rule2)]: {
            muted: true,
            benchmark_id: rule2.metadata.benchmark.id,
            benchmark_version: rule2.metadata.benchmark.version,
            rule_number: rule2.metadata.benchmark.rule_number
              ? rule2.metadata.benchmark.rule_number
              : '',
            rule_id: rule2.metadata.id,
          },
          [generateRuleKey(rule3)]: {
            muted: false,
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

    it('get empty object when rules states not exists', async () => {
      const { body } = await supertest
        .get(`/internal/cloud_security_posture/rules/_get_states`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expectExpect(body).toEqual({});
    });

    it('GET rules states API with user with read access', async () => {
      const { status } = await supertestWithoutAuth
        .get(`/internal/cloud_security_posture/rules/_get_states?tags=CIS`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .auth('role_security_read_user', cspSecurity.getPasswordForUser('role_security_read_user'));
      expect(status).to.be(200);
    });

    it('GET rules states API API with user without read access', async () => {
      const { status } = await supertestWithoutAuth
        .get(`/internal/cloud_security_posture/rules/_get_states`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .auth(
          'role_security_no_read_user',
          cspSecurity.getPasswordForUser('role_security_no_read_user')
        );
      expect(status).to.be(403);
    });
  });
}
