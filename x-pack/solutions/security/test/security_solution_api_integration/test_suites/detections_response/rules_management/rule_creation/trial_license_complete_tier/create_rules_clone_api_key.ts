/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ALERTING_CLONE_API_KEY_HEADER } from '@kbn/alerting-plugin/common';
import {
  deleteAllAlerts,
  deleteAllRules,
  waitForRuleSuccess,
} from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getCustomQueryRuleParams, getRuleSOById } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');

  // Callers such as Agent Builder create detection rules while authenticated with a short-lived
  // API key that is invalidated once their background task completes. By default an API-key-authed
  // create persists the caller's key on the rule ("user managed"), which would break the rule as
  // soon as that key is invalidated. The ALERTING_CLONE_API_KEY_HEADER declares the caller's key
  // as borrowed so alerting clones it into a framework-managed key the rule owns.
  describe('@ess @serverless @skipInServerlessMKI create rules with a borrowed API key', () => {
    before(async () => {
      await es.indices.delete({ index: 'logs-test', ignore_unavailable: true });
      await es.indices.create({
        index: 'logs-test',
        mappings: {
          properties: {
            '@timestamp': {
              type: 'date',
            },
          },
        },
      });
    });

    beforeEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    const createRuleWithApiKeyAuth = async (cloneHeaderValue?: string, enabled: boolean = true) => {
      // A key created without role descriptors inherits the creating user's privileges
      const apiKey = await es.security.createApiKey({ name: `de-borrowed-key-${Date.now()}` });

      const request = supertestWithoutAuth
        .post(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .set('Authorization', `ApiKey ${apiKey.encoded}`);

      if (cloneHeaderValue !== undefined) {
        void request.set(ALERTING_CLONE_API_KEY_HEADER, cloneHeaderValue);
      }

      const { body: rule } = await request.send(getCustomQueryRuleParams({ enabled })).expect(200);

      return { rule, apiKey };
    };

    const getApiKeyCreatedByUser = async (ruleId: string) => {
      const soResponse = await getRuleSOById(es, ruleId);
      return soResponse.hits.hits[0]?._source?.alert.apiKeyCreatedByUser;
    };

    it('stores a framework-managed API key on the rule when the clone API key header is set', async () => {
      const { rule, apiKey } = await createRuleWithApiKeyAuth('true');

      expect(await getApiKeyCreatedByUser(rule.id)).toBe(false);

      // The borrowed caller key going away must not affect the rule: it runs on its own cloned key
      await es.security.invalidateApiKey({ ids: [apiKey.id] });
      await waitForRuleSuccess({ supertest, log, id: rule.id });
    });

    it('persists the caller API key on the rule when the header is not set', async () => {
      const { rule, apiKey } = await createRuleWithApiKeyAuth();

      expect(await getApiKeyCreatedByUser(rule.id)).toBe(true);

      await es.security.invalidateApiKey({ ids: [apiKey.id] });
    });

    // A rule created disabled stores no API key and a null ownership. Enabling it later must
    // still honor the borrowed-key declaration and clone a framework-managed key, instead of
    // persisting the caller credential. This is the install-disabled-then-enable path Agent
    // Builder / AlertZero uses.
    it('stores a framework-managed API key when a rule created disabled is later enabled with the header set', async () => {
      const { rule, apiKey } = await createRuleWithApiKeyAuth('true', false);

      // Disabled create mints no key: ownership is null, not false
      expect(await getApiKeyCreatedByUser(rule.id)).toBe(null);

      await supertestWithoutAuth
        .patch(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .set('Authorization', `ApiKey ${apiKey.encoded}`)
        .set(ALERTING_CLONE_API_KEY_HEADER, 'true')
        .send({ rule_id: rule.rule_id, enabled: true })
        .expect(200);

      expect(await getApiKeyCreatedByUser(rule.id)).toBe(false);

      // The borrowed caller key going away must not affect the rule: it runs on its own cloned key
      await es.security.invalidateApiKey({ ids: [apiKey.id] });
      await waitForRuleSuccess({ supertest, log, id: rule.id });
    });
  });
};
