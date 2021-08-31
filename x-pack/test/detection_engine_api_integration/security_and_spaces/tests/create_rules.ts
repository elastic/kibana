/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';

import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_STATUS_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleMlRule,
  getSimpleMlRuleOutput,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  waitForAlertToComplete,
  getRuleForSignalTesting,
  getRuleForSignalTestingWithTimestampOverride,
} from '../../utils';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';
import { RuleStatusResponse } from '../../../../plugins/security_solution/server/lib/detection_engine/rules/types';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('create_rules', () => {
    describe('validation errors', () => {
      it('should give an error that the index must exist first if it does not exist before creating a rule', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(400);

        expect(body).to.eql({
          message:
            'To create a rule, the index must exist first. Index .siem-signals-default does not exist',
          status_code: 400,
        });
      });
    });

    describe('creating rules', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
      });

      describe('elastic admin', () => {
        it('should create a single rule with a rule_id', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleRule())
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).to.eql(getSimpleRuleOutput());
        });

        /*
         This test is to ensure no future regressions introduced by the following scenario
         a call to updateApiKey was invalidating the api key used by the
         rule while the rule was executing, or even before it executed,
         on the first rule run.
         this pr https://github.com/elastic/kibana/pull/68184
         fixed this by finding the true source of a bug that required the manual
         api key update, and removed the call to that function.

         When the api key is updated before / while the rule is executing, the alert
         executor no longer has access to a service to update the rule status
         saved object in Elasticsearch. Because of this, we cannot set the rule into
         a 'failure' state, so the user ends up seeing 'going to run' as that is the
         last status set for the rule before it erupts in an error that cannot be
         recorded inside of the executor.

         This adds an e2e test for the backend to catch that in case
         this pops up again elsewhere.
        */
        it('should create a single rule with a rule_id and validate it ran successfully', async () => {
          const simpleRule = getRuleForSignalTesting(['auditbeat-*']);
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(simpleRule)
            .expect(200);

          await waitForRuleSuccessOrStatus(supertest, body.id);

          const { body: statusBody } = await supertest
            .post(DETECTION_ENGINE_RULES_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send({ ids: [body.id] })
            .expect(200);

          expect(statusBody[body.id].current_status.status).to.eql('succeeded');
        });

        it('should create a single rule with a rule_id and an index pattern that does not match anything available and partial failure for the rule', async () => {
          const simpleRule = getRuleForSignalTesting(['does-not-exist-*']);
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(simpleRule)
            .expect(200);

          await waitForRuleSuccessOrStatus(supertest, body.id, 'partial failure');

          const { body: statusBody } = await supertest
            .post(DETECTION_ENGINE_RULES_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send({ ids: [body.id] })
            .expect(200);

          expect(statusBody[body.id].current_status.status).to.eql('partial failure');
          expect(statusBody[body.id].current_status.last_success_message).to.eql(
            'This rule is attempting to query data from Elasticsearch indices listed in the "Index pattern" section of the rule definition, however no index matching: ["does-not-exist-*"] was found. This warning will continue to appear until a matching index is created or this rule is de-activated.'
          );
        });

        it('should create a single rule with a rule_id and an index pattern that does not match anything and an index pattern that does and the rule should be successful', async () => {
          const simpleRule = getRuleForSignalTesting(['does-not-exist-*', 'auditbeat-*']);
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(simpleRule)
            .expect(200);

          await waitForRuleSuccessOrStatus(supertest, body.id, 'succeeded');

          const { body: statusBody } = await supertest
            .post(DETECTION_ENGINE_RULES_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send({ ids: [body.id] })
            .expect(200);

          expect(statusBody[body.id].current_status.status).to.eql('succeeded');
        });

        it('should create a single rule without an input index', async () => {
          const rule: CreateRulesSchema = {
            name: 'Simple Rule Query',
            description: 'Simple Rule Query',
            enabled: true,
            risk_score: 1,
            rule_id: 'rule-1',
            severity: 'high',
            type: 'query',
            query: 'user.name: root or user.name: admin',
          };
          const expected = {
            actions: [],
            author: [],
            created_by: 'elastic',
            description: 'Simple Rule Query',
            enabled: true,
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            interval: '5m',
            rule_id: 'rule-1',
            language: 'kuery',
            output_index: '.siem-signals-default',
            max_signals: 100,
            risk_score: 1,
            risk_score_mapping: [],
            name: 'Simple Rule Query',
            query: 'user.name: root or user.name: admin',
            references: [],
            severity: 'high',
            severity_mapping: [],
            updated_by: 'elastic',
            tags: [],
            to: 'now',
            type: 'query',
            threat: [],
            throttle: 'no_actions',
            exceptions_list: [],
            version: 1,
          };

          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).to.eql(expected);
        });

        it('should create a single rule without a rule_id', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleRuleWithoutRuleId())
            .expect(200);

          const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
          expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
        });

        it('creates a single Machine Learning rule from a legacy ML Rule format', async () => {
          const legacyMlRule = {
            ...getSimpleMlRule(),
            machine_learning_job_id: 'some_job_id',
          };
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(legacyMlRule)
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).to.eql(getSimpleMlRuleOutput());
        });

        it('should create a single Machine Learning rule', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleMlRule())
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).to.eql(getSimpleMlRuleOutput());
        });

        it('should cause a 409 conflict if we attempt to create the same rule_id twice', async () => {
          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleRule())
            .expect(200);

          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleRule())
            .expect(409);

          expect(body).to.eql({
            message: 'rule_id: "rule-1" already exists',
            status_code: 409,
          });
        });
      });

      describe('t1_analyst', () => {
        const role = ROLES.t1_analyst;

        beforeEach(async () => {
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should NOT be able to create a rule', async () => {
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_RULES_URL)
            .auth(role, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(getSimpleRule())
            .expect(403);
        });
      });
    });

    describe('missing timestamps', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
        // to edit these files run the following script
        // cd $HOME/kibana/x-pack && nvm use && node ../scripts/es_archiver edit security_solution/timestamp_override
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override'
        );
      });
      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override'
        );
      });

      it('should create a single rule which has a timestamp override for an index pattern that does not exist and write a partial failure status', async () => {
        // defaults to event.ingested timestamp override.
        // event.ingested is one of the timestamp fields set on the es archive data
        // inside of x-pack/test/functional/es_archives/security_solution/timestamp_override/data.json.gz
        const simpleRule = getRuleForSignalTestingWithTimestampOverride(['myfakeindex-1']);
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(simpleRule)
          .expect(200);
        const bodyId = body.id;

        await waitForAlertToComplete(supertest, bodyId);
        await waitForRuleSuccessOrStatus(supertest, bodyId, 'partial failure');

        const { body: statusBody } = await supertest
          .post(DETECTION_ENGINE_RULES_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: [bodyId] })
          .expect(200);

        expect((statusBody as RuleStatusResponse)[bodyId].current_status?.status).to.eql(
          'partial failure'
        );
        expect(
          (statusBody as RuleStatusResponse)[bodyId].current_status?.last_success_message
        ).to.eql(
          'The following indices are missing the timestamp override field "event.ingested": ["myfakeindex-1"]'
        );
      });

      it('should create a single rule which has a timestamp override and generates two signals with a "partial failure" status', async () => {
        // defaults to event.ingested timestamp override.
        // event.ingested is one of the timestamp fields set on the es archive data
        // inside of x-pack/test/functional/es_archives/security_solution/timestamp_override/data.json.gz
        const simpleRule = getRuleForSignalTestingWithTimestampOverride(['myfa*']);
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(simpleRule)
          .expect(200);
        const bodyId = body.id;

        await waitForRuleSuccessOrStatus(supertest, bodyId, 'partial failure');
        await waitForSignalsToBePresent(supertest, 2, [bodyId]);

        const { body: statusBody } = await supertest
          .post(DETECTION_ENGINE_RULES_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: [bodyId] })
          .expect(200);

        expect(statusBody[bodyId].current_status.status).to.eql('partial failure');
      });
    });
  });
};
