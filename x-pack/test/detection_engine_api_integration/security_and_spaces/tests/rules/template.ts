/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
/* eslint-disable prettier/prettier */
import {
  // {{#eqlQuery}}
  EqlCreateSchema,
  // {{/eqlQuery}}
  // {{#kqlQuery}}
  QueryCreateSchema,
  // {{/kqlQuery}}
  // {{#thresholdQuery}}
  ThresholdCreateSchema,
  // {{/thresholdQuery}}
} from '../../../../../plugins/security_solution/common/detection_engine/schemas/request';

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSignalsById,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../../utils';

/**
 * NOTE: This is generated from the template file of "template.ts"
 * All contents below should not be mustache once this is copied.
 * If you're staring at the original which is:
 *   x-pack/test/detection_engine_api_integration/security_and_spaces/tests/rules/template.ts
 * We keep this file as real code so it can go through prettier and maintenance but this original
 * never is run on the CI system. Instead all its generated and re-generated children are run through
 * the ci groups.
 */

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('{{description}}', () => {
    before(async () => {
      await esArchiver.load('{{archiver_file}}');
    });

    after(async () => {
      await esArchiver.unload('{{archiver_file}}');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
    });

    // {{#kqlQuery}}
    it('{{description}}', async () => {
      const rule: QueryCreateSchema = {
        name: 'Signal Testing Query',
        description: 'Tests a simple query',
        enabled: true,
        risk_score: 1,
        rule_id: '{{rule_id}}',
        severity: 'high',
        index: ['{{index}}'],
        type: 'query',
        query: '{{rule_query}}',
        from: '1900-01-01T00:00:00.000Z',
      };
      const { id } = await createRule(supertest, rule);
      await waitForRuleSuccessOrStatus(supertest, id);
      await waitForSignalsToBePresent(supertest, 1, [id]);
      const signalsOpen = await getSignalsById(supertest, id);
      expect(signalsOpen.hits.hits.length).to.be.above(0);
    });
    // {{/kqlQuery}}
    // {{#eqlQuery}}
    it('should detect the "dataset_name_1" from "event.dataset" and have 4 signals', async () => {
      const rule: EqlCreateSchema = {
        name: 'Signal Testing Query',
        description: 'Tests a simple query',
        enabled: true,
        risk_score: 1,
        rule_id: '{{rule_id}}',
        severity: 'high',
        index: ['{{index}}'],
        type: 'eql',
        language: 'eql',
        query: '{{rule_query}}',
        from: '1900-01-01T00:00:00.000Z',
      };

      const { id } = await createRule(supertest, rule);
      await waitForRuleSuccessOrStatus(supertest, id);
      await waitForSignalsToBePresent(supertest, 1, [id]);
      const signalsOpen = await getSignalsById(supertest, id);
      expect(signalsOpen.hits.hits.length).to.be.above(0);
    });
    // {{/eqlQuery}}
    // {{#thresholdQuery}}
    it('should detect the "dataset_name_1" from "event.dataset"', async () => {
      const rule: ThresholdCreateSchema = {
        name: 'Signal Testing Query',
        description: 'Tests a simple query',
        enabled: true,
        risk_score: 1,
        rule_id: '{{rule_id}}',
        severity: 'high',
        index: ['{{index}}'],
        query: '*:*',
        from: '1900-01-01T00:00:00.000Z',
        type: 'threshold',
        language: 'kuery',
        threshold: {
          field: 'process.name',
          value: 21,
        },
      };
      const { id } = await createRule(supertest, rule);
      await waitForRuleSuccessOrStatus(supertest, id);
      await waitForSignalsToBePresent(supertest, 1, [id]);
      const signalsOpen = await getSignalsById(supertest, id);
      await waitForSignalsToBePresent(supertest, 1, [id]);
      expect(signalsOpen.hits.hits.length).to.be.above(0);
    });
    // {{/thresholdQuery}}
  });
};

