/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { DETECTION_ENGINE_RULES_IMPORT_URL } from '@kbn/security-solution-plugin/common/constants';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { combineToNdJson, getCustomQueryRuleParams } from '../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI import rules transport errors', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('reports a parse error for corrupt NDJSON', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_IMPORT_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .attach('file', Buffer.from('this is not a valid ndjson string!'), 'rules.ndjson')
        .expect(200);

      expect(body).toMatchObject({
        success: false,
        success_count: 0,
        rules_count: 1,
      });
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].error.status_code).toBe(400);
      expect(body.errors[0].error.message).toContain('is not valid JSON');
    });

    it('imports an empty NDJSON file as zero rules', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_IMPORT_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .attach('file', Buffer.from(''), 'rules.ndjson')
        .expect(200);

      expect(body).toMatchObject({
        success: true,
        success_count: 0,
        rules_count: 0,
        errors: [],
      });
    });

    it('rejects the request when the file field is missing', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_IMPORT_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .set('Content-Type', 'multipart/form-data; boundary=boundary')
        .send('--boundary--')
        .expect(500);

      expect(body).toMatchObject({
        status_code: 500,
      });
      expect(typeof body.message).toBe('string');
    });

    it('rejects a non-multipart application/json body with a 500', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_IMPORT_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .set('Content-Type', 'application/json')
        .send({
          rule_id: 'non-multipart-json',
          name: 'Non multipart',
          description: 'Not a multipart upload',
          risk_score: 1,
          severity: 'low',
          type: 'query',
          query: '*',
        })
        .expect(500);

      expect(body).toMatchObject({
        status_code: 500,
      });
      expect(typeof body.message).toBe('string');
    });

    it('still accepts a valid rule after a blank line in the NDJSON stream', async () => {
      const ndjson = combineToNdJson(
        getCustomQueryRuleParams({ rule_id: 'after-blank-line', enabled: false })
      );

      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_IMPORT_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .attach('file', Buffer.from(`\n${ndjson}`), 'rules.ndjson')
        .expect(200);

      expect(body).toMatchObject({
        success: true,
        success_count: 1,
        rules_count: 1,
        errors: [],
      });

      const { body: imported } = await detectionsApi
        .readRule({ query: { rule_id: 'after-blank-line' } })
        .expect(200);

      expect(imported.rule_id).toBe('after-blank-line');
      expect(imported.enabled).toBe(false);
    });
  });
};
