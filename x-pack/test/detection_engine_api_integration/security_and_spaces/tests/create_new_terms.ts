/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEqual } from 'lodash';
import expect from '@kbn/expect';
import {
  ALERT_REASON,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_UPDATED_AT,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
  VERSION,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { RuleExecutionStatus } from '../../../../plugins/security_solution/common/detection_engine/schemas/common';
import {
  CreateRulesSchema,
  NewTermsCreateSchema,
} from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getOpenSignals,
  getSignalsByIds,
  removeServerGeneratedProperties,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';

import { getCreateNewTermsRulesSchemaMock } from '../../../../plugins/security_solution/common/detection_engine/schemas/request/rule_schemas.mock';
import { getThreatMatchingSchemaPartialMock } from '../../../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema.mocks';
import { Ancestor } from '../../../../plugins/security_solution/server/lib/detection_engine/signals/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_EVENT_ACTION,
  ALERT_ORIGINAL_EVENT_CATEGORY,
  ALERT_ORIGINAL_EVENT_MODULE,
  ALERT_ORIGINAL_TIME,
} from '../../../../plugins/security_solution/common/field_maps/field_names';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  /**
   * Specific api integration tests for threat matching rule type
   */
  describe('create_new_terms', () => {
    describe('creating new terms rule', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should create a single rule with a rule_id and validate it ran successfully', async () => {
        const ruleResponse = await createRule(
          supertest,
          log,
          getCreateNewTermsRulesSchemaMock('rule-1', true)
        );

        await waitForRuleSuccessOrStatus(
          supertest,
          log,
          ruleResponse.id,
          RuleExecutionStatus.succeeded
        );

        const { body: rule } = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .query({ id: ruleResponse.id })
          .expect(200);

        expect(rule?.execution_summary?.last_execution.status).to.eql('succeeded');
      });

      it('should generate 2 alerts with 1 selected field', async () => {
        const rule: NewTermsCreateSchema = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          new_terms_fields: ['host.name'],
          from: '2019-02-19T20:42:00.000Z',
          history_window_start: '2019-01-19T20:42:00.000Z',
        };

        const createdRule = await createRule(supertest, log, rule);

        await waitForRuleSuccessOrStatus(
          supertest,
          log,
          createdRule.id,
          RuleExecutionStatus.succeeded
        );

        const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
        signalsOpen.hits.hits.sort((a, b) => {
          const aHostName = a._source['host.name'];
        });
        expect(signalsOpen.hits.hits).
      });
    });
  });
};
